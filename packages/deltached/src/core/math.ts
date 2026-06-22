/**
 * Small pure-math helpers shared across the core and persist layers, so the
 * same clamp/lerp lives in one place instead of being re-implemented per file.
 */

/** Constrains `value` to the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** `clamp` specialized to 0..1, for fractions, progress and opacity. */
export const clamp01 = (value: number): number => clamp(value, 0, 1);

/** Linear interpolation from `a` to `b` at progress `p` (0..1). */
export const lerp = (a: number, b: number, p: number): number =>
  a + (b - a) * p;
