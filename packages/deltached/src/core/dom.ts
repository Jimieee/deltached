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
