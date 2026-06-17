/**
 * Environment guards and small DOM write helpers.
 */

export const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

export function prefersReducedMotion(): boolean {
  return (
    isBrowser && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * `will-change` is only valuable while the morph is running; keeping it
 * around wastes compositor memory, so it is always cleared on settle.
 */
export function setWillChange(el: HTMLElement, value = "transform"): void {
  el.style.willChange = value;
}

export function clearWillChange(el: HTMLElement): void {
  el.style.willChange = "";
}

/**
 * Present on an element while a morph is driving its opacity/visibility/
 * transform. deltached toggles these to hand a source off to (and back from)
 * the morph surface; a consumer CSS transition on those properties would
 * otherwise animate the handoff — e.g. a trigger button fading on its own
 * every time it disappears and reappears around the morph. Consumers opt out
 * with `[data-deltached-morphing] { transition: none }`.
 */
export const MORPHING_ATTRIBUTE = "data-deltached-morphing";

export function markMorphing(el: HTMLElement | null | undefined): void {
  el?.setAttribute(MORPHING_ATTRIBUTE, "");
}

export function unmarkMorphing(el: HTMLElement | null | undefined): void {
  el?.removeAttribute(MORPHING_ATTRIBUTE);
}
