/**
 * The Deltached flight engine — the dual-snapshot visual handoff shared by
 * every adapter. Geometry always lives on the frames (`outer` nodes); both
 * frames of a pair fly the same path so they read as ONE frame morphing
 * A → B, while the content (`inner`) is fitted inside per strategy. All
 * geometry uses the non-overshooting `ctx.geometryEase`.
 */

import { gsap } from "gsap";
import type {
  PersistAnimationContext,
  PersistGeometryStrategy,
  PersistHandoffConfig,
  PersistPair,
  PersistPairLayers,
  PersistSnapshot,
} from "./types";

/**
 * Tween vars for a snapshot's frame: numeric geometry ONLY.
 *
 * `borderRadius` is intentionally NOT here. GSAP cannot interpolate the
 * multi-value `border-radius`/`clip-path inset()` strings correctly — it
 * collapses the 8-value radius to two values and mangles the four insets —
 * so radii are driven manually by the session (`applyMorph`) from
 * interpolated numbers instead. Position/size are plain numbers GSAP tweens
 * fine.
 */
export function persistFrameVars(snapshot: PersistSnapshot): gsap.TweenVars {
  return {
    x: snapshot.rect.x,
    y: snapshot.rect.y,
    width: snapshot.rect.width,
    height: snapshot.rect.height,
  };
}

/**
 * Returns a function mapping a POSITION fraction (0..1 of the visual path)
 * to the TIME fraction at which the geometry ease reaches it — i.e. the
 * inverse of the ease. The geometry ease is monotonic up to its endpoint,
 * so a 30-step binary search inverts it precisely enough for timing.
 */
export function positionToTime(
  ease: string | gsap.EaseFunction,
): (position: number) => number {
  const fn = typeof ease === "function" ? ease : gsap.parseEase(ease);
  return (position: number) => {
    if (!fn) return position;
    const target = Math.min(Math.max(position, 0), 1);
    if (target <= 0) return 0;
    if (target >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (fn(mid) < target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
}

export interface PersistFlightOptions {
  /** Geometry strategy for both-sided pairs. */
  strategy: PersistGeometryStrategy;
  /** Per-pair overrides of the resolved handoff tuning. */
  handoff?: PersistHandoffConfig;
  /**
   * How the two layers blend during the handoff window:
   *
   * - `"cover"` (default): the NEW layer fades in ON TOP while the OLD one
   *   stays fully opaque underneath. Opaque content (images, surfaces)
   *   never shows a translucent dip, and the old layer only ever
   *   "disappears" once the new one has fully appeared — it is then removed
   *   at teardown. This is the guarantee for media and HTML wrappers.
   * - `"dissolve"`: both layers cross-fade (old → 0, new → 1). Required for
   *   text, whose glyphs can't cover other glyphs — keeping the old text
   *   opaque underneath would show double text.
   */
  blend?: "cover" | "dissolve";
}

/**
 * Deltached flight engine — the dual-snapshot visual handoff:
 *
 *   0%        → the old layer (faithful clone of A) dominates;
 *   ~39–61%   → soft centered crossfade A → B (the strong change hides
 *               mid-travel, where the eye accepts it);
 *   100%      → the new layer sits EXACTLY on the real element's rect,
 *               scale 1 — the swap to the real DOM at settle is invisible.
 *
 * Geometry always lives on the frames; both frames fly the same path so
 * they read as ONE frame morphing A → B. With `handoff.enabled: false`
 * only the old layer flies (single-clone mode — exact when both sides show
 * the same content, e.g. same-src images). Single-sided pairs dissolve out
 * (start-anchored) or in (end-anchored). All geometry uses the
 * non-overshooting `ctx.geometryEase`.
 */
export function animatePersistPair(
  pair: PersistPair,
  layers: PersistPairLayers,
  ctx: PersistAnimationContext,
  options: PersistFlightOptions,
): void {
  const { timeline: tl, duration, geometryEase: ease } = ctx;
  const dissolve = Math.max(duration * ctx.timings.contentFadeFraction, 0.01);

  if (pair.from && pair.to && layers.fromLayer && layers.toLayer) {
    const a = pair.from.rect;
    const b = pair.to.rect;
    const from = layers.fromLayer;
    const to = layers.toLayer;
    const handoff = { ...ctx.handoff, ...options.handoff };
    let strategy = options.strategy;
    if (strategy === "scale-to-fit" && !handoff.scaleToFit) strategy = "rect";

    if (strategy === "rect" || strategy === "scale-to-fit") {
      // Both frames morph A → B along the same path; their border-radius is
      // driven together by the session's morph progress (see applyMorph),
      // not here, because GSAP can't interpolate the multi-value string.
      const endFrame = persistFrameVars(pair.to);
      tl.to(from.outer, { ...endFrame, duration, ease }, 0);
      tl.to(to.outer, { ...endFrame, duration, ease }, 0);

      if (strategy === "scale-to-fit") {
        // Uniform width-driven inner scale (origin top-left): the inner's
        // visual width stays flush with the frame at every tick by
        // construction (same ease on both), the height difference is a
        // controlled crop inside the frame — content never distorts.
        // ONLY for custom adapters whose inners are NATURAL-size: scaling
        // a fluid (100%) inner would double-transform it past the frame.
        gsap.set(from.inner, { transformOrigin: "0 0" });
        tl.to(from.inner, { scale: b.width / a.width, duration, ease }, 0);
        gsap.set(to.inner, {
          transformOrigin: "0 0",
          scale: a.width / b.width,
        });
        tl.to(to.inner, { scale: 1, duration, ease }, 0);
      }
    } else if (strategy === "crossfade-only") {
      // No travel: each layer sits at its own real rect; only the blend.
      gsap.set(to.outer, {
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
      });
    }
    // "adapter-custom": the adapter added its own geometry tweens.

    if (handoff.enabled) {
      // Anchor the handoff to POSITION progress, not raw time. The geometry
      // ease is front-loaded (it tracks the snappy surface), so at 50% of
      // the *time* the layers are already ~85% of the way to their
      // destination — a time-centered crossfade then reads as a late swap
      // "once everything is almost positioned". Mapping the window through
      // the inverse ease makes the swap happen when the layers are at
      // `handoff.at` of their visual PATH (mid-travel by default).
      const toTime = positionToTime(ease);
      const half = handoff.window / 2;
      const startTime = toTime(handoff.at - half) * duration;
      const endTime = toTime(handoff.at + half) * duration;
      const windowSec = Math.max(endTime - startTime, 0.01);
      const start = Math.min(Math.max(startTime, 0), duration - windowSec);
      // The real "to" element may not be fully opaque; the layer matches it.
      const toAlpha = parseFloat(pair.to.computed.opacity) || 1;
      // The new layer always fades IN, centered mid-flight (it is on top).
      tl.to(
        to.outer,
        { autoAlpha: toAlpha, duration: windowSec, ease: handoff.easing },
        start,
      );
      // "dissolve" also fades the old layer OUT (text). "cover" leaves it
      // opaque underneath — the new layer covers it as it appears, so the
      // pair never dips, and the old layer is removed only at teardown.
      if (options.blend === "dissolve") {
        tl.to(
          from.outer,
          { autoAlpha: 0, duration: windowSec, ease: handoff.easing },
          start,
        );
      }
    }
    // handoff disabled → the to-layer stays hidden the whole flight and
    // the from-layer (ending exactly on the target frame) carries it alone.
  } else if (pair.from && layers.fromLayer) {
    // Old state with no destination: dissolve where it stands.
    tl.to(
      layers.fromLayer.outer,
      { autoAlpha: 0, duration: dissolve, ease: "power2.out" },
      0,
    );
  } else if (pair.to && layers.toLayer) {
    // New state with no origin: appear at its final rect, near the end.
    const toAlpha = parseFloat(pair.to.computed.opacity) || 1;
    tl.to(
      layers.toLayer.outer,
      { autoAlpha: toAlpha, duration: dissolve, ease: "power2.in" },
      Math.max(duration - dissolve, 0),
    );
  }
}
