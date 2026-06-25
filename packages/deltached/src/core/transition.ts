import { gsap } from "gsap";
import {
  blurVars,
  buildEnterTimeline,
  buildFadeEnter,
  buildFadeLeave,
  buildLeaveTimeline,
  frameVars,
  type MorphElements,
} from "./animator";
import { ensureEases, resolveTimings } from "./config";
import {
  clearWillChange,
  isBrowser,
  markMorphing,
  prefersReducedMotion,
  setWillChange,
  unmarkMorphing,
  viewportSize,
} from "./dom";
import { measureGeometry } from "./measure";
import {
  DEFAULT_PLACEMENT,
  DEFAULT_PLACEMENT_MARGIN,
  isOriginPlacement,
  resolveOriginGeometry,
} from "./placement";
import { PersistSession, resolvePersistConfig } from "../persist/session";
import type { ResolvedPersistConfig } from "../persist/types";
import type {
  ElementGeometry,
  EnterOptions,
  DeltachedConfig,
  DeltachedHooks,
  DeltachedTimings,
  Placement,
  TransitionPhase,
} from "./types";

/**
 * Pinning takes the target out of flow at the viewport origin so its box can
 * be animated in rect coordinates (same principle as GSAP Flip's
 * `absolute: true`), and neutralizes everything that could make the rendered
 * box differ from the measured one:
 *
 * - `min/max-width/height` are lifted: they beat inline styles, so a surface
 *   with `min-height` would otherwise render taller than the morph frame.
 * - `right/bottom: auto` and `margin: 0` remove over-constrained positioning
 *   (e.g. `inset: 0; margin: auto` centering).
 * - `xPercent/yPercent/scale/rotation` are zeroed so an inherited CSS
 *   transform (e.g. `translate(-50%, -50%)` centering) can't compose with
 *   the morph — position is driven only by px x/y, size only by real
 *   width/height. One channel each: no double transformation, no scale.
 * - `overflow: hidden` keeps content clipped by the interpolated radius;
 *   `box-sizing: border-box` makes the measured rect size and the CSS
 *   width/height agree regardless of padding/borders.
 *
 * Everything here is restored via `clearProps` when the morph settles.
 */
const PIN_VARS: gsap.TweenVars = {
  position: "fixed",
  top: 0,
  left: 0,
  right: "auto",
  bottom: "auto",
  margin: 0,
  minWidth: 0,
  minHeight: 0,
  maxWidth: "none",
  maxHeight: "none",
  boxSizing: "border-box",
  overflow: "hidden",
  xPercent: 0,
  yPercent: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
};

/** Inline props the morph may set on the target; cleared when it settles. */
const TARGET_RESET_PROPS =
  "position,top,left,right,bottom,margin,minWidth,minHeight,maxWidth,maxHeight," +
  "boxSizing,overflow,width,height,transform,opacity,visibility," +
  "borderRadius,backgroundColor,padding";
/**
 * Subset cleared when an `"origin"`-placed target settles open: everything in
 * {@link TARGET_RESET_PROPS} EXCEPT the positioning channels
 * (`position`/`top`/`left`/`transform`). Those stay inline so the panel holds
 * the runtime resting frame CSS can't reproduce, while size, padding and
 * overflow/max-height return to CSS so the open panel scrolls normally again.
 */
const ORIGIN_OPEN_RESET_PROPS =
  "right,bottom,margin,minWidth,minHeight,maxWidth,maxHeight," +
  "boxSizing,overflow,width,height,opacity,visibility," +
  "borderRadius,backgroundColor,padding";
const CONTENT_RESET_PROPS = "opacity,visibility,filter";

/**
 * Deltached transition controller for any source/target pair.
 *
 * The morph animates the target's real box (translate + width/height) while
 * pinned out of flow — never scale — so shape, border-radius, and content
 * proportions are preserved at every frame. Both endpoints live in the same
 * property space (x/y/width/height), so interrupting a transition simply
 * retweens from the current values; rapid open/close never breaks the DOM.
 *
 * Persisted child elements (config.persist) ride the same timeline
 * as temporary layers in a fixed overlay; see `persistSession.ts`.
 *
 * The controller owns measurement, animation, and visibility. Everything
 * else (CSS classes, scroll lock, focus, mounting) belongs in hooks — the one
 * exception is `data-deltached-morphing`, which it sets on the source and
 * target while it drives their opacity/visibility/transform so consumer CSS
 * can suppress its own transitions during the handoff (see `dom.ts`).
 */
/**
 * A 0×0 read means the target was never laid out — almost always a target left
 * at `display: none` (e.g. the `hidden` attribute) that `beforeEnter` failed to
 * reveal. The morph would silently animate from nothing, so surface it.
 */
function warnIfUnmeasurable(target: HTMLElement, geo: ElementGeometry): void {
  if (geo.rect.width > 0 || geo.rect.height > 0) return;
  console.warn(
    "[DeltachedTransition] target measured 0×0 at enter() — it is likely " +
      "still display:none. Lay it out in beforeEnter before the morph " +
      "measures (the React/Vue/Svelte wrappers do this via autoHide).",
    target,
  );
}

export class DeltachedTransition {
  private readonly target: HTMLElement;
  private readonly backdrop: HTMLElement | null;
  private readonly defaultSource: HTMLElement | null;
  private readonly contentOption: DeltachedConfig["content"];
  private readonly hooks: DeltachedHooks;
  private readonly timings: DeltachedTimings;
  private readonly persistCfg: ResolvedPersistConfig | null;
  private readonly placement: Placement;
  private readonly placementMargin: number;

  private ctx: gsap.Context | null;
  private tl: gsap.core.Timeline | null = null;
  private phaseValue: TransitionPhase = "idle";
  private source: HTMLElement | null = null;
  private naturalGeo: ElementGeometry | null = null;
  private pinned = false;
  // Placement resolved for the in-flight transition; read by finishEnter to
  // decide whether the open target keeps its anchored positioning or hands
  // everything back to CSS. Set whenever a non-resumable enter measures.
  private activePlacement: Placement = DEFAULT_PLACEMENT;
  private activeContent: HTMLElement[] = [];
  private persistSession: PersistSession | null = null;
  private settle: ((completed: boolean) => void) | null = null;
  // Bumped whenever a transition begins. A deferred unmark captures the value
  // at schedule time and only fires if it's still current, so a transition
  // that re-claims the elements before the next frame keeps them marked.
  private morphGen = 0;
  // Pending rAF id coalescing a burst of resize events into one re-anchor.
  private reanchorRaf = 0;
  // Re-anchors an open origin-placed panel against the live viewport. Bound
  // once, attached to `resize` for the instance's lifetime, and a no-op unless
  // an origin panel is actually open — see `reanchor()`.
  private readonly onViewportChange = (): void => {
    if (this.reanchorRaf) return;
    this.reanchorRaf = requestAnimationFrame(() => {
      this.reanchorRaf = 0;
      this.reanchor();
    });
  };

  constructor(config: DeltachedConfig) {
    if (!config?.target) {
      throw new Error("[DeltachedTransition] `target` element is required.");
    }
    this.target = config.target;
    this.defaultSource = config.source ?? null;
    this.backdrop = config.backdrop ?? null;
    this.contentOption = config.content;
    this.hooks = config.hooks ?? {};
    this.timings = resolveTimings(config.timings);
    this.persistCfg = resolvePersistConfig(config.persist);
    this.placement = config.placement ?? DEFAULT_PLACEMENT;
    this.placementMargin = config.placementMargin ?? DEFAULT_PLACEMENT_MARGIN;
    // One context per instance collects every tween/setter for full revert.
    this.ctx = isBrowser ? gsap.context(() => {}) : null;
    // Origin placement derives the panel's position from the live viewport, so
    // it must follow viewport changes while open; the handler self-guards, so a
    // never-origin instance pays only a passive, early-returning listener.
    if (isBrowser) {
      window.addEventListener("resize", this.onViewportChange, {
        passive: true,
      });
    }
    ensureEases();
  }

  public get phase(): TransitionPhase {
    return this.phaseValue;
  }

  public get isOpen(): boolean {
    return this.phaseValue === "open";
  }

  public get isIdle(): boolean {
    return this.phaseValue === "idle";
  }

  public get isAnimating(): boolean {
    return this.phaseValue === "entering" || this.phaseValue === "leaving";
  }

  /**
   * Morphs the target in from a source element.
   * Resolves `true` when the transition settles, `false` if it was skipped
   * or interrupted by another call.
   */
  public enter(options: EnterOptions = {}): Promise<boolean> {
    if (!isBrowser || !this.ctx) return Promise.resolve(false);
    if (this.phaseValue === "entering" || this.phaseValue === "open") {
      return Promise.resolve(false);
    }
    const from = options.from ?? this.defaultSource;
    if (!from || !from.isConnected) {
      console.warn(
        "[DeltachedTransition] enter() needs a connected source element.",
      );
      return Promise.resolve(false);
    }
    // Per-call placement overrides the instance default; resolved here so a
    // resumed leave keeps whatever the original open used (it skips re-measure).
    const placement = options.placement ?? this.placement;

    // Interrupted mid-leave with a pinned target: geometry is still valid and
    // the box is mid-morph, so skip setup and retween from current values.
    const resumable =
      this.phaseValue === "leaving" && !!this.naturalGeo && this.pinned;
    // Keep the in-flight persist session so its live layers can reverse back
    // to the target (where this re-entry is headed) instead of being dropped.
    const reuseSession = resumable && !!this.persistSession;
    const prevSource = this.source;
    this.cancelActive(reuseSession);
    this.source = from;
    this.phaseValue = "entering";
    this.morphGen++;

    const t = this.timings;
    const content = (this.activeContent = this.resolveContent());
    const els: MorphElements = {
      target: this.target,
      source: from,
      backdrop: this.backdrop,
      content,
    };

    return new Promise((resolve) => {
      this.settle = resolve;
      this.ctx!.add(() => {
        // Claim both elements before any opacity/visibility write below, so a
        // consumer transition can't animate the handoff. Same synchronous
        // frame as the gsap.set calls — the suppression is in place first.
        markMorphing(this.target);
        markMorphing(from);

        // If a leave was interrupted, a different origin may have been left
        // mid-handoff; restore it before adopting the new one.
        if (prevSource && prevSource !== from && prevSource.isConnected) {
          gsap.set(prevSource, { clearProps: "opacity,visibility" });
          unmarkMorphing(prevSource);
        }

        let tl: gsap.core.Timeline;
        if (prefersReducedMotion()) {
          if (!resumable) {
            gsap.set(this.target, { autoAlpha: 0 });
            this.hooks.beforeEnter?.();
            const naturalGeo = measureGeometry(this.target);
            warnIfUnmeasurable(this.target, naturalGeo);
            if (isOriginPlacement(placement)) {
              // Reduced motion skips the morph, but origin placement must still
              // open the panel at the source instead of the CSS center: pin it
              // at the resting frame so the plain fade reveals it there.
              const restingGeo = resolveOriginGeometry(
                placement,
                measureGeometry(from),
                naturalGeo,
                viewportSize(),
                this.placementMargin,
              );
              gsap.set(this.target, { ...PIN_VARS, ...frameVars(restingGeo) });
              this.pinned = true;
              this.naturalGeo = restingGeo;
            } else {
              this.naturalGeo = naturalGeo;
            }
            this.activePlacement = placement;
          }
          gsap.set(from, { autoAlpha: 0 });
          tl = buildFadeEnter(els, t);
        } else if (!resumable) {
          // Hide the target before its container becomes visible so it can
          // be measured at rest without flashing on screen.
          gsap.set(this.target, { autoAlpha: 0 });
          this.hooks.beforeEnter?.();

          // Read phase: both measurements together, after the hook's writes.
          const sourceGeo = measureGeometry(from);
          const naturalGeo = measureGeometry(this.target);
          warnIfUnmeasurable(this.target, naturalGeo);
          // Origin placement rebases the resting frame onto the source (clamped
          // to the viewport, read once here); center leaves the natural in-flow
          // frame untouched. Either way naturalGeo is the open-end of the morph.
          const restingGeo = isOriginPlacement(placement)
            ? resolveOriginGeometry(
                placement,
                sourceGeo,
                naturalGeo,
                viewportSize(),
                this.placementMargin,
              )
            : naturalGeo;
          this.naturalGeo = restingGeo;
          this.activePlacement = placement;
          // Persisted children, same read phase: the source's are still
          // visible (hidden below, in the write phase); the target's are
          // autoAlpha-hidden but laid out, so their rects are the final
          // open-layout rects.
          const session = this.persistCfg
            ? new PersistSession(this.persistCfg, t, "enter")
            : null;
          session?.capture(from, this.target);
          if (isOriginPlacement(placement)) {
            // The children were captured at the natural layout; shift their
            // destinations by the same rigid translation that rebased the
            // surface so the layers ride it instead of landing offset.
            session?.translateTo(
              restingGeo.rect.x - naturalGeo.rect.x,
              restingGeo.rect.y - naturalGeo.rect.y,
            );
          }

          // Write phase: pin the target out of flow, shaped exactly like the
          // source, then swap visibility. Same synchronous frame — no flicker.
          gsap.set(this.target, {
            ...PIN_VARS,
            ...frameVars(sourceGeo),
            autoAlpha: 1,
          });
          this.pinned = true;
          if (content.length) {
            gsap.set(content, {
              opacity: 0,
              ...blurVars(t.contentBlur, t.contentBlur),
            });
          }
          if (this.backdrop) gsap.set(this.backdrop, { autoAlpha: 0 });
          gsap.set(from, { autoAlpha: 0 });
          session?.mount(sourceGeo, this.naturalGeo);
          setWillChange(this.target);
          tl = buildEnterTimeline(els, this.naturalGeo, t);
          session?.attach(tl, t.enterDuration, t.enterEase);
          this.persistSession = session;
        } else {
          gsap.set(from, { autoAlpha: 0 });
          setWillChange(this.target);
          tl = buildEnterTimeline(els, this.naturalGeo!, t);
          // Reverse the preserved layers back to the target with the surface.
          this.persistSession?.retarget(
            tl,
            t.enterDuration,
            t.enterEase,
            "enter",
          );
        }

        tl.eventCallback("onComplete", () => this.finishEnter());
        this.tl = tl;
      });
    });
  }

  /**
   * Morphs the target back onto the source used by the last enter().
   * The source only becomes visible during the final handoff window, while
   * the morph surface still covers it — never before the transition ends.
   */
  public leave(): Promise<boolean> {
    if (!isBrowser || !this.ctx) return Promise.resolve(false);
    if (this.phaseValue === "idle" || this.phaseValue === "leaving") {
      return Promise.resolve(false);
    }

    const resumable =
      this.phaseValue === "entering" && !!this.naturalGeo && this.pinned;
    // Keep the in-flight persist session so its live layers can reverse back
    // to the source instead of being dropped.
    const reuseSession = resumable && !!this.persistSession;
    this.cancelActive(reuseSession);
    this.phaseValue = "leaving";
    this.morphGen++;

    const t = this.timings;
    const source = this.source?.isConnected ? this.source : null;
    const content = (this.activeContent = this.activeContent.length
      ? this.activeContent
      : this.resolveContent());
    const els: MorphElements = {
      target: this.target,
      source,
      backdrop: this.backdrop,
      content,
    };

    return new Promise((resolve) => {
      this.settle = resolve;
      this.ctx!.add(() => {
        this.hooks.beforeLeave?.();

        // Re-claim the target (released after enter settled) and keep the
        // source claimed through the return handoff, so neither animates the
        // visibility writes below on its own.
        markMorphing(this.target);
        markMorphing(source);

        let tl: gsap.core.Timeline;
        if (prefersReducedMotion() || !source) {
          // No morph possible/desired: fall back to a plain fade so the
          // lifecycle (and cleanup) stays identical.
          tl = buildFadeLeave(els, t);
        } else {
          // Re-measure the source: it may have moved/resized while open.
          const sourceGeo = measureGeometry(source);
          let session: PersistSession | null = null;
          if (!resumable) {
            // Settled open: the target is back in flow, so its live rect is
            // the resting frame (absorbs any resize while open). Re-pin at
            // that exact frame — same synchronous frame, no visual jump.
            this.naturalGeo = measureGeometry(this.target);
            // Persisted children, same read phase: the open target holds
            // the OLD visual state, the (hidden but laid out) source holds
            // the NEW one. Both re-measured fresh — they may have moved.
            if (this.persistCfg) {
              session = new PersistSession(this.persistCfg, t, "leave");
              session.capture(this.target, source);
            }
            gsap.set(this.target, {
              ...PIN_VARS,
              ...frameVars(this.naturalGeo),
            });
            this.pinned = true;
            // The source's persisted children stay hidden until finishLeave,
            // so the handoff window (source fading back in at the end) can
            // never double-paint a real child under its still-flying layer.
            session?.mount(this.naturalGeo, sourceGeo);
          }
          setWillChange(this.target);
          tl = buildLeaveTimeline(els, sourceGeo, t);
          if (resumable) {
            // Resumed mid-enter: reverse the PRESERVED layers back to the
            // source so the persisted children ride home with the surface
            // instead of being dropped.
            this.persistSession?.retarget(
              tl,
              t.leaveDuration,
              t.leaveEase,
              "leave",
            );
          } else {
            session?.attach(tl, t.leaveDuration, t.leaveEase);
            this.persistSession = session;
          }
        }

        tl.eventCallback("onComplete", () => this.finishLeave(source));
        this.tl = tl;
      });
    });
  }

  /** Kills animations, reverts every style the system touched, detaches. */
  public destroy(): void {
    this.cancelActive();
    this.ctx?.revert();
    this.ctx = null;
    if (isBrowser) {
      clearWillChange(this.target);
      window.removeEventListener("resize", this.onViewportChange);
      if (this.reanchorRaf) cancelAnimationFrame(this.reanchorRaf);
      this.reanchorRaf = 0;
    }
    // Invalidate any pending deferred unmark, then drop the attribute now.
    this.morphGen++;
    unmarkMorphing(this.target);
    unmarkMorphing(this.source);
    this.naturalGeo = null;
    this.source = null;
    this.pinned = false;
    this.activeContent = [];
    this.phaseValue = "idle";
  }

  /**
   * Recomputes an open origin-placed panel's resting position against the
   * CURRENT viewport and source location, then re-applies it. The position is
   * a runtime, viewport-derived value CSS can't hold, so without this the panel
   * would freeze at its open-time coordinates and drift off-screen as the
   * window resizes. The SIZE stays CSS-owned (already responsive) — only x/y
   * move — and naturalGeo is updated so a later leave morphs home from the
   * frame actually on screen. No-op unless an origin panel is currently open.
   */
  private reanchor(): void {
    if (
      this.phaseValue !== "open" ||
      !isOriginPlacement(this.activePlacement) ||
      !this.naturalGeo ||
      !this.source?.isConnected
    ) {
      return;
    }
    const sourceGeo = measureGeometry(this.source);
    // The panel's live box: width/height are the current CSS-driven size
    // (transforms don't scale them); only its position needs recomputing.
    const r = this.target.getBoundingClientRect();
    const sizeGeo: ElementGeometry = {
      ...this.naturalGeo,
      rect: { x: r.left, y: r.top, width: r.width, height: r.height },
    };
    const anchored = resolveOriginGeometry(
      this.activePlacement,
      sourceGeo,
      sizeGeo,
      viewportSize(),
      this.placementMargin,
    );
    this.naturalGeo = anchored;
    gsap.set(this.target, { x: anchored.rect.x, y: anchored.rect.y });
  }

  private finishEnter(): void {
    // Layer → real handoff first, same synchronous frame as everything
    // below: the overlay disappears and the real persisted children become
    // visible together — no flash, and afterEnter() observes a clean DOM.
    this.persistSession?.teardown();
    this.persistSession = null;
    if (isOriginPlacement(this.activePlacement)) {
      // Origin placement: the resting frame was computed from the source +
      // viewport at open time, so CSS cannot reproduce it. Keep the
      // positioning channels pinned inline and hand only size/appearance back
      // to CSS, so the panel stays anchored while regaining its natural
      // max-height/overflow (and thus internal scrolling) for the open state.
      gsap.set(this.target, { clearProps: ORIGIN_OPEN_RESET_PROPS });
      // Still pinned (position/transform live on the element); a later leave
      // re-measures and re-pins from here, so this stays accurate.
      this.pinned = true;
    } else {
      // Un-pin: drop every morph-only inline style so CSS owns the open state.
      // The element re-enters flow at its natural frame, so nothing jumps.
      gsap.set(this.target, { clearProps: TARGET_RESET_PROPS });
      this.pinned = false;
    }
    if (this.activeContent.length) {
      gsap.set(this.activeContent, { clearProps: CONTENT_RESET_PROPS });
    }
    clearWillChange(this.target);
    // The target is back in flow at its open frame; release it next frame so
    // its CSS transitions are live for the open state. The source stays
    // claimed — it's still hidden until the matching leave restores it.
    this.scheduleUnmark(this.target);
    this.tl = null;
    this.phaseValue = "open";
    this.hooks.afterEnter?.();
    this.resolveSettle(true);
  }

  private finishLeave(source: HTMLElement | null): void {
    // Every reset below runs in the same synchronous frame as afterLeave(),
    // so no intermediate state can ever paint.
    // Layer → real handoff: restores the source's persisted children right
    // as the source itself is fully revealed by the handoff window.
    this.persistSession?.teardown();
    this.persistSession = null;
    gsap.set(this.target, { clearProps: TARGET_RESET_PROPS });
    this.pinned = false;
    // The Deltached surface "returned" to the source: keep the target hidden so
    // consumers that hide/unmount its container a frame later see no flash.
    gsap.set(this.target, { autoAlpha: 0 });
    if (this.activeContent.length) {
      gsap.set(this.activeContent, { clearProps: CONTENT_RESET_PROPS });
    }
    if (source) gsap.set(source, { clearProps: "opacity,visibility" });
    if (this.backdrop) {
      gsap.set(this.backdrop, { clearProps: "opacity,visibility" });
    }
    clearWillChange(this.target);
    // Release both next frame: the source's opacity was just restored to its
    // resting value with transitions still suppressed, so re-enabling them now
    // (this frame) would animate that 0 -> 1 jump — the exact fade we prevent.
    this.scheduleUnmark(source);
    this.scheduleUnmark(this.target);
    this.tl = null;
    this.naturalGeo = null;
    this.source = null;
    this.phaseValue = "idle";
    this.hooks.afterLeave?.();
    this.resolveSettle(true);
  }

  /**
   * Drops `data-deltached-morphing` from an element one frame later, but only
   * if no newer transition has re-claimed it since (see `morphGen`). The frame
   * delay is essential: the element's final opacity/transform was committed
   * this frame with transitions off, so removing the attribute now would let a
   * consumer transition fire on that settle.
   */
  private scheduleUnmark(el: HTMLElement | null): void {
    if (!el) return;
    const gen = this.morphGen;
    const run = () => {
      if (this.morphGen === gen) unmarkMorphing(el);
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
    else run();
  }

  private cancelActive(preserveSession = false): void {
    if (this.tl) {
      this.tl.kill();
      this.tl = null;
    }
    // Killing the timeline stops every persist tween (they live on it), but
    // the overlay DOM and the inline visibility hiding the real children are
    // not tween state. Normally the session must be torn down here so nothing
    // orphaned or hidden survives. The exception is a resumable interrupt:
    // the caller keeps the SAME session alive and re-targets its live layers
    // back to the origin, so the persisted children reverse and ride home
    // with the surface instead of vanishing.
    if (!preserveSession) {
      this.persistSession?.teardown();
      this.persistSession = null;
    }
    this.resolveSettle(false);
  }

  private resolveSettle(completed: boolean): void {
    const resolve = this.settle;
    this.settle = null;
    resolve?.(completed);
  }

  private resolveContent(): HTMLElement[] {
    const c = this.contentOption;
    if (typeof c === "function") return c();
    if (Array.isArray(c)) return c;
    return Array.from(this.target.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    );
  }
}

/** Convenience factory mirroring `new DeltachedTransition(config)`. */
export function createDeltachedTransition(
  config: DeltachedConfig,
): DeltachedTransition {
  return new DeltachedTransition(config);
}
