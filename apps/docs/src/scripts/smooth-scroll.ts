import { gsap } from "gsap";
import Lenis from "lenis";

/**
 * Smooth "gliding on ice" scrolling, driven by the GSAP ticker so it shares a
 * single rAF loop with every other animation on the page.
 *
 * Why Lenis and not GSAP ScrollSmoother: ScrollSmoother translates a wrapper,
 * and a `transform` on an ancestor breaks `position: fixed` for everything
 * inside it. deltached pins its morph target with `position: fixed` + viewport
 * rects, so a transformed scroller would desync every morph the moment the
 * page is scrolled. Lenis moves the real window scroll instead — no wrapper
 * transform — so fixed positioning (and the morphs) stay exact.
 *
 * `getLenis()` exposes the instance; `lockScroll`/`unlockScroll` let the modal
 * controller freeze the page while a dialog is open (with a no-Lenis fallback
 * for reduced-motion).
 */

let lenis: Lenis | null = null;
let tick: ((time: number) => void) | null = null;

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function initSmoothScroll(): () => void {
  // Honor reduced-motion: leave native scrolling untouched.
  if (typeof window === "undefined" || reducedMotion()) {
    return () => {};
  }

  lenis = new Lenis({
    // Lower lerp = longer glide. ~0.08 reads as the slidey, low-friction feel.
    lerp: 0.08,
    wheelMultiplier: 1,
    smoothWheel: true,
  });

  // GSAP owns the clock. lagSmoothing(0) keeps Lenis in lockstep with GSAP
  // tweens even after a stall, so scroll and morphs never drift apart.
  tick = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  return () => {
    if (tick) gsap.ticker.remove(tick);
    tick = null;
    lenis?.destroy();
    lenis = null;
  };
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Freeze page scroll (modal open). Falls back to body overflow without Lenis. */
export function lockScroll(): void {
  if (lenis) lenis.stop();
  else if (typeof document !== "undefined") {
    document.body.style.overflow = "hidden";
  }
}

export function unlockScroll(): void {
  if (lenis) lenis.start();
  else if (typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
}
