/**
 * Per-transition orchestration of persisted child elements.
 *
 * One `PersistSession` lives exactly as long as one enter/leave flight:
 * capture (reads) → mount (writes: hide reals, build overlay + layers) →
 * attach (tweens onto the MAIN timeline) → teardown (remove overlay,
 * restore reals). Because every tween rides the main timeline, killing it
 * in `cancelActive()` stops the whole flight atomically; the session only
 * owns the DOM and inline-visibility state that tweens can't undo.
 */

import { gsap } from "gsap";
import { builtinPersistAdapters, defaultClassify } from "./adapters";
import { persistFrameVars, positionToTime } from "./flight";
import {
  clamp01,
  insetFrame,
  insetFrameLerp,
  lerpRadius,
} from "./geometry";
import {
  capturePersistSnapshots,
  pairPersistSnapshots,
} from "./measure";
import {
  DEFAULT_PERSIST_ATTRIBUTE,
  type PersistAdapter,
  type PersistAnimationContext,
  type PersistConfig,
  type PersistContextBase,
  type PersistDirection,
  type PersistHandoffConfig,
  type PersistKind,
  type PersistPair,
  type PersistPairLayers,
  type ResolvedPersistConfig,
} from "./types";
import type { ElementGeometry, DeltachedTimings } from "../core/types";

const DEFAULT_OVERLAY_Z = 9999;

/**
 * Default visual handoff, expressed in PATH PROGRESS (not time): the swap is
 * centered slightly before mid-path and spans a wide band, so it clearly
 * happens *on the way* — well before the layers finish positioning — rather
 * than as a late cut near the destination. The flight engine maps this band
 * through the inverse geometry ease, so it lands at these visual positions
 * regardless of how front-loaded the surface ease is. `easing: "none"`
 * keeps the opacity ramp even across the (time-compressed) band.
 */
const DEFAULT_HANDOFF: Required<PersistHandoffConfig> = {
  enabled: true,
  at: 0.45,
  window: 0.42,
  easing: "none",
  scaleToFit: true,
};

/**
 * Default layer-geometry ease: the surface's own ease clamped at 1. Layers
 * must track the surface (and the clip-to-surface window) in perfect sync —
 * a slower curve makes them visibly lag and get cut by the clip — but the
 * surface ease overshoots ~2%, which would make layers momentarily larger
 * than their destination. Clamping keeps the timing and kills the overshoot.
 */
function clampedSurfaceEase(surfaceEase: string): gsap.EaseFunction {
  const raw = gsap.parseEase(surfaceEase);
  return (progress: number) => Math.min(raw(progress), 1);
}

/** Tolerance (px) for the debug end-of-flight size check. */
const SIZE_CHECK_TOLERANCE = 2;

function resolveHandoff(
  handoff: PersistHandoffConfig | undefined,
): Required<PersistHandoffConfig> {
  const h = { ...DEFAULT_HANDOFF, ...handoff };
  h.window = clamp01(h.window);
  // Keep the whole window inside the flight.
  h.at = Math.min(Math.max(h.at, h.window / 2), 1 - h.window / 2);
  return h;
}

/** Applies defaults; `null` means the feature is fully off (zero new paths). */
export function resolvePersistConfig(
  persist: PersistConfig | false | undefined,
): ResolvedPersistConfig | null {
  if (!persist || persist.enabled === false) return null;
  const attribute = persist.attribute ?? DEFAULT_PERSIST_ATTRIBUTE;
  const adapters = { ...builtinPersistAdapters };
  for (const [kind, adapter] of Object.entries(persist.adapters ?? {})) {
    if (adapter) adapters[kind as PersistKind] = adapter;
  }
  return {
    attribute,
    selector: persist.selector ?? `[${attribute}]`,
    debug: persist.debug ?? false,
    adapters,
    customProvided: !!persist.adapters?.custom,
    classify: persist.classify ?? defaultClassify,
    overflow: persist.overflow ?? "clip-to-surface",
    handoff: resolveHandoff(persist.handoff),
    geometryEase: persist.geometryEase ?? null,
    zIndex: persist.zIndex ?? DEFAULT_OVERLAY_Z,
  };
}

export class PersistSession {
  private readonly resolved: ResolvedPersistConfig;
  private readonly timings: DeltachedTimings;
  private readonly direction: PersistDirection;
  private readonly warnFn: (message: string) => void;

  private pairs: PersistPair[] = [];
  private layers = new Map<PersistPair, PersistPairLayers>();
  private overlay: HTMLElement | null = null;
  private hiddenReals: HTMLElement[] = [];
  private viewport = { width: 0, height: 0 };
  private scrollAtCapture = { x: 0, y: 0 };
  private surfaceFrom: ElementGeometry | null = null;
  private surfaceTo: ElementGeometry | null = null;
  private clipped = false;
  private done = false;
  // Morph progress (0 = surfaceFrom side, 1 = surfaceTo side). Drives every
  // string-valued property GSAP can't interpolate — the overlay clip and the
  // layer border-radii — through `applyMorph`. Persists across interrupts so
  // the reversal is continuous.
  private readonly morphProgress = { value: 0 };

  constructor(
    resolved: ResolvedPersistConfig,
    timings: DeltachedTimings,
    direction: PersistDirection,
  ) {
    this.resolved = resolved;
    this.timings = timings;
    this.direction = direction;
    this.warnFn = (message) => {
      if (this.resolved.debug) {
        console.warn(`[DeltachedTransition:persist] ${message}`);
      }
    };
  }

  private get baseCtx(): PersistContextBase {
    return {
      direction: this.direction,
      timings: this.timings,
      debug: this.resolved.debug,
      warn: this.warnFn,
    };
  }

  /**
   * Read phase. `fromRoot` always holds the OLD visual state and `toRoot`
   * the NEW one (the controller passes source/target in the right order per
   * direction), so pairs always animate from → to. Grouped reads only —
   * call before any write of the transition's write phase.
   */
  public capture(fromRoot: HTMLElement, toRoot: HTMLElement): void {
    const from = capturePersistSnapshots(
      fromRoot,
      { ...this.baseCtx, role: "from" },
      this.resolved,
    );
    const to = capturePersistSnapshots(
      toRoot,
      { ...this.baseCtx, role: "to" },
      this.resolved,
    );
    for (const snapshot of [...from, ...to]) {
      if (snapshot.computed.transform !== "none") {
        this.warnFn(
          `"${snapshot.id}" has a computed transform; the layer matches its visual box but renders its content untransformed.`,
        );
      }
    }
    this.pairs = pairPersistSnapshots(from, to);
    this.viewport = { width: window.innerWidth, height: window.innerHeight };
    this.scrollAtCapture = { x: window.scrollX, y: window.scrollY };
  }

  /**
   * Write phase, same synchronous frame as the controller's pin/visibility
   * swap — nothing intermediate can paint:
   * 1. hide the real persisted elements on BOTH sides with `visibility`
   *    only (the content fade owns the opacity/filter channels; tweening
   *    them on an invisible element is harmless and each channel is cleared
   *    independently at settle);
   * 2. build the overlay + one layer per snapshot, every layer of a pair
   *    starting at the OLD rect (the "to" layer hidden and on top);
   * 3. append the overlay last so it paints above the pinned surface.
   */
  public mount(
    surfaceFrom: ElementGeometry,
    surfaceTo: ElementGeometry,
  ): void {
    if (!this.pairs.length || this.done || this.overlay) return;
    this.surfaceFrom = surfaceFrom;
    this.surfaceTo = surfaceTo;

    const reals = new Set<HTMLElement>();
    for (const pair of this.pairs) {
      if (pair.from) reals.add(pair.from.element);
      if (pair.to) reals.add(pair.to.element);
    }
    this.hiddenReals = [...reals];
    // NOTE: the reals are hidden AFTER the layers are built (end of this
    // method), never before — adapters clone real elements with
    // `cloneNode(true)`, which copies inline styles, so hiding first would
    // bake `visibility: hidden` into every text/surface clone and make them
    // invisible for the whole flight. Everything here is one synchronous
    // frame, so the late hide still cannot paint a duplicate.

    const overlay = document.createElement("div");
    overlay.setAttribute("aria-hidden", "true");
    // The overlay is never transformed/filtered: that would create a
    // containing block and break the 1:1 viewport mapping of layer coords.
    const s = overlay.style;
    s.position = "fixed";
    s.inset = "0";
    s.pointerEvents = "none";
    s.zIndex = String(this.resolved.zIndex);
    this.clipped = this.resolved.overflow === "clip-to-surface";
    if (this.clipped) s.clipPath = insetFrame(surfaceFrom, this.viewport);

    const layerCtx = { ...this.baseCtx, overlay };
    // Cloned layers inherit the match attribute; strip it so the temporary
    // DOM never pollutes consumer queries for `[data-deltached-id]`.
    const stripAttribute = (layer: HTMLElement) => {
      layer.removeAttribute(this.resolved.attribute);
      for (const el of layer.querySelectorAll(`[${this.resolved.attribute}]`)) {
        el.removeAttribute(this.resolved.attribute);
      }
    };
    // Explicit, monotonically increasing z-index per layer guarantees a
    // STABLE stacking order that never depends on a clone's inherited class
    // z-index (which could paint a layer out of order) or on append timing:
    // later pairs sit above earlier ones, and each pair's "to" sits just
    // above its "from" for the crossfade. The order is identical on enter,
    // leave and every interrupt.
    let z = 1;
    for (const pair of this.pairs) {
      const pairLayers: PersistPairLayers = {};
      // Both layers of a pair depart from the old rect; a to-only pair has
      // nowhere to travel from and simply appears at its final rect.
      const start = (pair.from ?? pair.to)!.rect;
      if (pair.from) {
        const layer = this.resolved.adapters[pair.from.kind].createLayer(
          pair.from,
          "from",
          layerCtx,
        );
        stripAttribute(layer.outer);
        gsap.set(layer.outer, {
          x: start.x,
          y: start.y,
          width: start.width,
          height: start.height,
          zIndex: z++,
          autoAlpha: parseFloat(pair.from.computed.opacity) || 1,
        });
        overlay.appendChild(layer.outer);
        pairLayers.fromLayer = layer;
      }
      if (pair.to) {
        const layer = this.resolved.adapters[pair.to.kind].createLayer(
          pair.to,
          "to",
          layerCtx,
        );
        stripAttribute(layer.outer);
        // Generic initial seat (correct for frame strategies); adapters
        // re-seat it per strategy in the same write batch, before anything
        // can paint.
        gsap.set(layer.outer, {
          x: start.x,
          y: start.y,
          width: start.width,
          height: start.height,
          zIndex: z++,
          autoAlpha: 0,
        });
        overlay.appendChild(layer.outer);
        pairLayers.toLayer = layer;
      }
      this.layers.set(pair, pairLayers);
    }

    // Now that every clone is built from the still-visible reals, hide the
    // reals. Same synchronous frame as the appendChild below — no flash, no
    // duplicate paints, and the clones stay visible because they were cloned
    // before this write.
    gsap.set(this.hiddenReals, { visibility: "hidden" });

    document.body.appendChild(overlay);
    this.overlay = overlay;
    // Set the initial clip + layer radii from the morph progress (0).
    this.applyMorph();
  }

  /**
   * Writes every string-valued property GSAP cannot interpolate — the
   * overlay clip and each layer's border-radius — from the current morph
   * progress. Driven each frame by `addMorphDriver` so these stay exact
   * (GSAP mangles the 8-value radius and the four-value inset).
   */
  private applyMorph(): void {
    const p = this.morphProgress.value;
    if (this.clipped && this.overlay && this.surfaceFrom && this.surfaceTo) {
      this.overlay.style.clipPath = insetFrameLerp(
        this.surfaceFrom,
        this.surfaceTo,
        this.viewport,
        p,
      );
    }
    for (const pair of this.pairs) {
      const layers = this.layers.get(pair);
      if (!layers) continue;
      const radius = lerpRadius(
        pair.from?.computed.borderRadius,
        pair.to?.computed.borderRadius,
        p,
      );
      if (layers.fromLayer) layers.fromLayer.outer.style.borderRadius = radius;
      if (layers.toLayer) layers.toLayer.outer.style.borderRadius = radius;
    }
  }

  /**
   * Tweens the morph progress to `target` (1 = surfaceTo, 0 = surfaceFrom),
   * driving the clip + radii every frame. One driver for the whole flight;
   * on interrupt the progress is continuous, so the reversal is seamless.
   */
  private addMorphDriver(
    timeline: gsap.core.Timeline,
    target: number,
    duration: number,
    ease: string | gsap.EaseFunction,
  ): void {
    timeline.to(
      this.morphProgress,
      { value: target, duration, ease, onUpdate: () => this.applyMorph() },
      0,
    );
  }

  /**
   * Adds every persist tween onto the MAIN timeline (position 0), sharing
   * its playhead: they start, get killed, and complete together with the
   * surface morph — which is what keeps interruptions coherent.
   */
  public attach(
    timeline: gsap.core.Timeline,
    duration: number,
    ease: string,
  ): void {
    if (!this.overlay) return;
    const geometryEase = this.resolved.geometryEase ?? clampedSurfaceEase(ease);
    // Drive the clip + radii (string props) to the surfaceTo side manually,
    // in lockstep with the layers (same geometryEase), so the clip can never
    // mangle or let a layer escape the morphing silhouette.
    this.addMorphDriver(timeline, 1, duration, geometryEase);
    const ctx: PersistAnimationContext = {
      ...this.baseCtx,
      timeline,
      duration,
      ease,
      geometryEase,
      handoff: this.resolved.handoff,
    };
    for (const pair of this.pairs) {
      const layers = this.layers.get(pair) ?? {};
      const result = this.resolved.adapters[pair.kind].animate(
        pair,
        layers,
        ctx,
      );
      if (result) timeline.add(result, 0);
      // Anti-overshoot guard (debug only): just before the flight settles,
      // the visible layer's frame must not exceed the real target rect.
      // Runs as a timeline callback, so it dies with the timeline and
      // never fires on interrupted flights.
      if (this.resolved.debug && pair.to && layers.toLayer) {
        const outer = layers.toLayer.outer;
        const expected = pair.to.rect;
        const id = pair.id;
        timeline.call(
          () => {
            const r = outer.getBoundingClientRect();
            if (
              r.width > expected.width + SIZE_CHECK_TOLERANCE ||
              r.height > expected.height + SIZE_CHECK_TOLERANCE
            ) {
              this.warnFn(
                `"${id}" visual layer exceeds its target rect near the end of the flight ` +
                  `(${r.width.toFixed(1)}×${r.height.toFixed(1)} vs ${expected.width.toFixed(1)}×${expected.height.toFixed(1)}).`,
              );
            }
          },
          [],
          Math.max(duration - 0.02, 0),
        );
      }
    }
  }

  /**
   * Interruption / reversal. When a flight is cancelled mid-way and the
   * controller morphs the surface toward a new heading, this re-tweens the
   * SAME live layers (kept alive — never torn down on the interrupt) toward
   * that heading on the new timeline. Because the layers and their stored
   * snapshots already exist, there is no re-capture (no mid-morph "lying"
   * rects) and no flash: the persisted children reverse and ride along with
   * the surface instead of vanishing.
   *
   * `heading` is where the controller is now going (`"enter"` → target,
   * `"leave"` → source). Mapped against this session's fixed `from`/`to`
   * roots it picks which snapshot each layer flies to and which layer wins
   * the crossfade — so repeated back-and-forth interruptions all resolve to
   * the correct endpoint. Tweens start from the layers' current values, so
   * the reversal is seamless.
   */
  public retarget(
    timeline: gsap.core.Timeline,
    duration: number,
    surfaceEase: string,
    heading: PersistDirection,
  ): void {
    if (!this.overlay || this.done) return;
    const geometryEase =
      this.resolved.geometryEase ?? clampedSurfaceEase(surfaceEase);
    // This session's `to` IS the heading destination only when the heading
    // matches the session's own direction; otherwise we are reversing toward
    // its `from`.
    const sameDir = heading === this.direction;
    const destRole: "from" | "to" = sameDir ? "to" : "from";

    // Drive the clip + radii (string props) back to the heading side from
    // their current progress — continuous, no mangling, in lockstep with the
    // layers below.
    this.addMorphDriver(timeline, sameDir ? 1 : 0, duration, geometryEase);

    // Position-anchored handoff window (same mid-path band as the forward run).
    const h = this.resolved.handoff;
    const toTime = positionToTime(geometryEase);
    const half = h.window / 2;
    const winStart = toTime(h.at - half) * duration;
    const winSec = Math.max(toTime(h.at + half) * duration - winStart, 0.01);

    for (const pair of this.pairs) {
      const layers = this.layers.get(pair);
      if (!layers) continue;
      const { fromLayer, toLayer } = layers;
      const dest = destRole === "to" ? pair.to : pair.from;
      const destLayer = destRole === "to" ? toLayer : fromLayer;
      const otherLayer = destRole === "to" ? fromLayer : toLayer;

      if (dest) {
        // Both layers fly to the destination frame; the destination layer
        // wins the crossfade, the other leaves.
        const back = persistFrameVars(dest);
        const destAlpha = parseFloat(dest.computed.opacity) || 1;
        if (destLayer) {
          timeline.to(destLayer.outer, { ...back, duration, ease: geometryEase }, 0);
          timeline.to(destLayer.outer, { autoAlpha: destAlpha, duration: winSec, ease: h.easing }, winStart);
        }
        if (otherLayer) {
          timeline.to(otherLayer.outer, { ...back, duration, ease: geometryEase }, 0);
          timeline.to(otherLayer.outer, { autoAlpha: 0, duration: winSec, ease: h.easing }, winStart);
        }
        // Text scales its inner; return it to natural (1) so the winning
        // layer matches the real element exactly at settle.
        if (pair.kind === "text") {
          if (destLayer) timeline.to(destLayer.inner, { scale: 1, duration, ease: geometryEase }, 0);
          if (otherLayer) timeline.to(otherLayer.inner, { scale: 1, duration, ease: geometryEase }, 0);
        }
      } else {
        // The heading side has no counterpart for this child — it does not
        // exist there, so whatever is showing dissolves away in place.
        if (destLayer) timeline.to(destLayer.outer, { autoAlpha: 0, duration: winSec, ease: h.easing }, winStart);
        if (otherLayer) timeline.to(otherLayer.outer, { autoAlpha: 0, duration: winSec, ease: h.easing }, winStart);
      }
    }
  }

  /**
   * Idempotent. Removes the overlay and restores the real elements in the
   * same synchronous frame, so the layer → real handoff can never flash or
   * leave hidden children behind. It does NOT kill tweens — they belong to
   * the main timeline, which the controller kills/completes. Runs from
   * `cancelActive()` (covering interrupts and `destroy()`) and from
   * `finishEnter()`/`finishLeave()`.
   */
  public teardown(): void {
    if (this.done) return;
    this.done = true;
    // Scroll is not supported mid-flight: rects are viewport-relative, so
    // scrolling leaves every snapshot stale (same caveat as the surface).
    if (
      this.resolved.debug &&
      this.overlay &&
      (Math.abs(window.scrollX - this.scrollAtCapture.x) > 1 ||
        Math.abs(window.scrollY - this.scrollAtCapture.y) > 1)
    ) {
      this.warnFn(
        "the page scrolled during the transition; persisted snapshots are viewport-relative and were stale for this flight.",
      );
    }
    if (this.hiddenReals.length) {
      gsap.set(this.hiddenReals, { clearProps: "visibility" });
    }
    this.overlay?.remove();
    this.overlay = null;
    const used = new Set<PersistAdapter>();
    for (const pair of this.pairs) {
      used.add(this.resolved.adapters[pair.kind]);
      if (pair.from) used.add(this.resolved.adapters[pair.from.kind]);
      if (pair.to) used.add(this.resolved.adapters[pair.to.kind]);
    }
    for (const adapter of used) adapter.cleanup?.(this.baseCtx);
    this.pairs = [];
    this.layers.clear();
    this.hiddenReals = [];
    this.surfaceTo = null;
  }
}
