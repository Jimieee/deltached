import { gsap } from "gsap";
import type { ElementGeometry, DeltachedTimings } from "./types";

/** Elements involved in a single transition run. */
export interface MorphElements {
  target: HTMLElement;
  source: HTMLElement | null;
  backdrop: HTMLElement | null;
  content: HTMLElement[];
}

/** Filter vars only when blur is enabled, so no filter is ever animated otherwise. */
export function blurVars(px: number, value: number): gsap.TweenVars {
  return px > 0 ? { filter: `blur(${value}px)` } : {};
}

/**
 * Tween vars describing a measured visual frame.
 *
 * Shape preservation: the morph animates the element's real box — translate
 * (compositor-friendly) plus actual width/height — and interpolates
 * borderRadius/backgroundColor/padding as real CSS values. No scale is ever
 * applied, so the element can't stretch, its radius stays geometrically
 * correct at every frame, and content never inherits a non-uniform distortion.
 *
 * Padding is interpolated edge by edge so the surface's content box tracks the
 * morph: it holds the source's padding at the source end and the target's at
 * the target end. Without this the (fixed) padding would keep in-flow content
 * offset from the source once the box has shrunk onto it.
 *
 * Assumes the element is pinned at the viewport origin
 * (`position: fixed; top: 0; left: 0`), so rect coordinates map 1:1 to x/y.
 */
export function frameVars(geo: ElementGeometry): gsap.TweenVars {
  return {
    x: geo.rect.x,
    y: geo.rect.y,
    width: geo.rect.width,
    height: geo.rect.height,
    borderRadius: geo.borderRadius,
    backgroundColor: geo.backgroundColor,
    paddingTop: geo.padding.top,
    paddingRight: geo.padding.right,
    paddingBottom: geo.padding.bottom,
    paddingLeft: geo.padding.left,
  };
}

/**
 * Enter: the target starts pinned and shaped like the source (initial state
 * is set by the controller) and morphs to its resting frame while its
 * content fades in. Content is only faded, never scaled.
 */
export function buildEnterTimeline(
  els: MorphElements,
  natural: ElementGeometry,
  t: DeltachedTimings,
): gsap.core.Timeline {
  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });

  tl.to(
    els.target,
    {
      ...frameVars(natural),
      // Restored explicitly in case an interrupted leave started the handoff fade.
      opacity: 1,
      duration: t.enterDuration,
      ease: t.enterEase,
    },
    0,
  );

  if (els.backdrop) {
    tl.to(
      els.backdrop,
      {
        autoAlpha: t.backdropOpacity,
        duration: t.enterDuration * t.backdropFadeFraction,
        ease: "none",
      },
      0,
    );
  }

  if (els.content.length) {
    const fade = t.enterDuration * t.contentFadeFraction;
    tl.to(els.content, { opacity: 1, duration: fade, ease: "power2.in" }, 0);
    if (t.contentBlur > 0) {
      tl.to(
        els.content,
        { ...blurVars(t.contentBlur, 0), duration: fade * 2, ease: "power2.out" },
        0,
      );
    }
  }

  return tl;
}

/**
 * Leave: the target morphs onto the source's current frame. The source is
 * revealed only during the final handoff window, while the morph surface is
 * still covering it and fading out — so it can never flash in early.
 */
export function buildLeaveTimeline(
  els: MorphElements,
  sourceGeo: ElementGeometry,
  t: DeltachedTimings,
): gsap.core.Timeline {
  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
  const d = t.leaveDuration;
  const handoff = d * t.handoffFraction;

  tl.to(
    els.target,
    { ...frameVars(sourceGeo), duration: d, ease: t.leaveEase },
    0,
  );

  if (els.content.length) {
    tl.to(
      els.content,
      {
        opacity: 0,
        ...blurVars(t.contentBlur, t.contentBlur),
        duration: d * t.contentFadeFraction,
        ease: "power2.out",
      },
      0,
    );
  }

  if (els.backdrop) {
    tl.to(
      els.backdrop,
      { autoAlpha: 0, duration: d * t.backdropFadeFraction, ease: "none" },
      0,
    );
  }

  if (els.source && handoff > 0) {
    tl.to(
      els.source,
      { autoAlpha: 1, duration: handoff, ease: "power1.inOut" },
      d - handoff,
    );
    tl.to(
      els.target,
      { opacity: 0, duration: handoff, ease: "power1.inOut" },
      d - handoff,
    );
  }

  return tl;
}

/** Reduced-motion enter: a plain fade, no geometry morph. */
export function buildFadeEnter(
  els: MorphElements,
  t: DeltachedTimings,
): gsap.core.Timeline {
  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
  const d = t.reducedMotionDuration;

  tl.to(els.target, { autoAlpha: 1, duration: d, ease: "none" }, 0);
  if (els.content.length) {
    tl.to(els.content, { opacity: 1, duration: d, ease: "none" }, 0);
  }
  if (els.backdrop) {
    tl.to(els.backdrop, { autoAlpha: t.backdropOpacity, duration: d, ease: "none" }, 0);
  }
  return tl;
}

/** Reduced-motion leave; also used as fallback when the source is gone. */
export function buildFadeLeave(
  els: MorphElements,
  t: DeltachedTimings,
): gsap.core.Timeline {
  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
  const d = t.reducedMotionDuration;

  tl.to(els.target, { autoAlpha: 0, duration: d, ease: "none" }, 0);
  if (els.backdrop) {
    tl.to(els.backdrop, { autoAlpha: 0, duration: d, ease: "none" }, 0);
  }
  if (els.source) {
    tl.to(els.source, { autoAlpha: 1, duration: d, ease: "none" }, 0);
  }
  return tl;
}
