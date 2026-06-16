/**
 * Pure geometry interpolation for the persist overlay: the radius and
 * clip-path math GSAP cannot tween (it mangles the 8-value radius and the
 * four-value inset). The session drives these manually from a morph
 * progress so both stay exact across the flight and any interrupt.
 */

import type { ElementGeometry } from "../core/types";

interface Viewport {
  width: number;
  height: number;
}

export const clamp01 = (value: number): number =>
  Math.min(Math.max(value, 0), 1);

export const lerp = (a: number, b: number, p: number): number =>
  a + (b - a) * p;

/** Parses a canonical `h1 h2 h3 h4 / v1 v2 v3 v4` radius into 8 px numbers. */
export function parseRadius(canonical: string): number[] {
  const [h, v] = canonical.split("/");
  const nums = (s: string) =>
    s.trim().split(/\s+/).map((n) => parseFloat(n) || 0);
  const fill = (arr: number[]) =>
    [0, 1, 2, 3].map((i) => arr[i] ?? arr[arr.length - 1] ?? 0);
  return [...fill(nums(h)), ...fill(nums(v ?? h))];
}

export function radiusToString(r: number[]): string {
  return `${r.slice(0, 4).map((n) => `${n}px`).join(" ")} / ${r
    .slice(4)
    .map((n) => `${n}px`)
    .join(" ")}`;
}

/**
 * Interpolates between two canonical radius strings at progress `p`.
 * GSAP cannot do this (it collapses/mangles the 8-value form), so the
 * session interpolates the numbers itself and rebuilds the string.
 */
export function lerpRadius(
  a: string | undefined,
  b: string | undefined,
  p: number,
): string {
  if (!a) return b ?? "0px";
  if (!b) return a;
  const ra = parseRadius(a);
  const rb = parseRadius(b);
  return radiusToString(ra.map((v, i) => lerp(v, rb[i], p)));
}

/**
 * The overlay's clip for a given surface frame: the surface box plus its
 * radius, in viewport coordinates (the overlay spans the viewport, so
 * inset() maps 1:1).
 */
export function insetFrame(geo: ElementGeometry, viewport: Viewport): string {
  const { x, y, width, height } = geo.rect;
  const right = viewport.width - x - width;
  const bottom = viewport.height - y - height;
  return `inset(${y}px ${right}px ${bottom}px ${x}px round ${geo.borderRadius})`;
}

/** Interpolates the overlay clip between two surface frames at progress `p`. */
export function insetFrameLerp(
  from: ElementGeometry,
  to: ElementGeometry,
  viewport: Viewport,
  p: number,
): string {
  const x = lerp(from.rect.x, to.rect.x, p);
  const y = lerp(from.rect.y, to.rect.y, p);
  const w = lerp(from.rect.width, to.rect.width, p);
  const h = lerp(from.rect.height, to.rect.height, p);
  const right = viewport.width - x - w;
  const bottom = viewport.height - y - h;
  const radius = lerpRadius(from.borderRadius, to.borderRadius, p);
  return `inset(${y}px ${right}px ${bottom}px ${x}px round ${radius})`;
}
