import type { ElementGeometry, Rect } from "./types";

const CORNERS = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius",
] as const;

function toPx(component: string, basis: number): number {
  const value = parseFloat(component) || 0;
  return component.trim().endsWith("%") ? (value / 100) * basis : value;
}

/**
 * Resolves the computed border-radius into a canonical 8-value px string
 * ("h1 h2 h3 h4 / v1 v2 v3 v4"). Percentages are resolved against the
 * measured rect (horizontal radii vs width, vertical radii vs height), so
 * elliptical corners stay exact and both morph endpoints share the same
 * format and units — which interpolates smoothly, with no format jumps.
 */
export function resolveBorderRadius(
  style: CSSStyleDeclaration,
  rect: Rect,
): string {
  const horizontal: string[] = [];
  const vertical: string[] = [];
  for (const corner of CORNERS) {
    // Computed corner values are "h" or "h v" (elliptical).
    const [h, v = h] = style[corner].split(" ");
    horizontal.push(`${toPx(h, rect.width)}px`);
    vertical.push(`${toPx(v, rect.height)}px`);
  }
  return `${horizontal.join(" ")} / ${vertical.join(" ")}`;
}

/**
 * Read-only DOM measurement. Callers must group these reads together and
 * perform all writes afterwards to avoid layout thrashing.
 *
 * The rect is the element's real visual box (border-box, transforms
 * included) in viewport coordinates, which matches the coordinate space of
 * an element pinned at `position: fixed; top: 0; left: 0`.
 */
export function measureGeometry(el: HTMLElement): ElementGeometry {
  const r = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const rect: Rect = { x: r.left, y: r.top, width: r.width, height: r.height };
  return {
    rect,
    borderRadius: resolveBorderRadius(style, rect),
    backgroundColor: style.backgroundColor,
  };
}
