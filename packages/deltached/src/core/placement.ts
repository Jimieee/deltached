import { clamp } from "./math";
import type { ElementGeometry, Placement, Rect } from "./types";

/**
 * Placement defaults, kept here next to the resolver instead of scattered as
 * literals at the call sites.
 */

/** Used when neither {@link DeltachedConfig} nor `enter()` sets a placement. */
export const DEFAULT_PLACEMENT: Placement = "center";

/**
 * Gutter (px) kept between an origin-family target and every viewport edge
 * while its resting frame is clamped on screen. A documented, overridable
 * default (`config.placementMargin`) — never a magic number at the call site.
 */
export const DEFAULT_PLACEMENT_MARGIN = 16;

/**
 * Per-axis anchoring of the panel relative to the source span:
 *
 * - `"center"` — panel center on source center; the panel grows EVENLY to both
 *   ends of the axis.
 * - `"start"`  — panel start edge on source start edge; the panel grows toward
 *   the END (down on Y, right on X).
 * - `"end"`    — panel end edge on source end edge; the panel grows toward the
 *   START (up on Y, left on X).
 */
type AxisAnchor = "center" | "start" | "end";

interface OriginAnchor {
  x: AxisAnchor;
  y: AxisAnchor;
}

/** Origin placements that map to a fixed pair of anchors (i.e. not `"origin-auto"`). */
type DirectionalPlacement =
  | "origin"
  | "origin-top"
  | "origin-bottom"
  | "origin-left"
  | "origin-right";

/**
 * Each directional placement is just a pair of per-axis anchors run through the
 * same primitive — no bespoke math per direction. The cross axis stays centered
 * for the side variants so e.g. `origin-bottom` grows straight down while
 * staying horizontally centered on the trigger.
 */
const ORIGIN_ANCHORS: Record<DirectionalPlacement, OriginAnchor> = {
  origin: { x: "center", y: "center" },
  "origin-top": { x: "center", y: "end" },
  "origin-bottom": { x: "center", y: "start" },
  "origin-left": { x: "end", y: "center" },
  "origin-right": { x: "start", y: "center" },
};

/** True for every placement that anchors to the source (i.e. not `"center"`). */
export function isOriginPlacement(placement: Placement): boolean {
  return placement !== "center";
}

/**
 * Picks the vertical side for `"origin-auto"`: anchor to the source's top or
 * bottom edge and grow toward whichever has more room — opening downward by
 * default and flipping up when there's no space below. Recomputed on every
 * viewport change, so the direction flips live as the window resizes. The cross
 * axis is positioned separately by the caller (proportional, not centered).
 */
function resolveAutoDirection(
  src: Rect,
  viewport: { width: number; height: number },
  margin: number,
): DirectionalPlacement {
  // Room to grow toward each vertical side, consistent with the anchors above:
  // `origin-bottom` aligns the panel's top to the source's top (room below it),
  // `origin-top` aligns bottoms (room above the source's bottom).
  const availDown = viewport.height - src.y - margin;
  const availUp = src.y + src.height - margin;
  return availDown >= availUp ? "origin-bottom" : "origin-top";
}

/**
 * Resolves one axis: places a `size`-long box against a source span (`srcStart`
 * + `srcSize`) per `anchor`, then shifts it the minimum amount needed to keep
 * `margin` clear at both ends of an `extent`-long viewport.
 *
 * The anchor decides the GROWTH DIRECTION; the shift makes it viewport-aware —
 * a source near an edge can't honor its anchor without overflowing, so the box
 * slides inward instead of clamping a corner off-screen (which is what looked
 * lopsided). If the box is larger than the available run it pins to the near
 * margin and the target's own max-size/overflow take over. Same principle as
 * Floating-UI's `shift` middleware.
 */
function placeAxis(
  anchor: AxisAnchor,
  srcStart: number,
  srcSize: number,
  size: number,
  extent: number,
  margin: number,
): number {
  let pos: number;
  if (anchor === "start") pos = srcStart;
  else if (anchor === "end") pos = srcStart + srcSize - size;
  else pos = srcStart + srcSize / 2 - size / 2;
  // Far-edge limit, floored at `margin` so an oversized box can't invert.
  const max = Math.max(margin, extent - size - margin);
  return clamp(pos, margin, max);
}

/**
 * Smart alignment for `origin-auto`'s cross axis: the source keeps the same
 * relative position INSIDE the panel that it has inside the viewport. A source
 * at the viewport center opens centered; one off-center leans toward the
 * OPPOSITE side — continuously, with no center/side threshold.
 *
 * The lean is then constrained so the panel always fully CONTAINS the source,
 * exactly like `origin-left`/`origin-right` do (one edge stays glued to the
 * source's edge). Without this the proportional lean can drift the panel off
 * the source near an edge — the source pokes out and the panel no longer reads
 * as growing from it. Finally clamped to the margins like every other axis.
 */
function placeAxisProportional(
  srcStart: number,
  srcSize: number,
  size: number,
  extent: number,
  margin: number,
): number {
  const srcCenter = srcStart + srcSize / 2;
  // Where the source sits across the viewport (0 = left edge, 1 = right edge);
  // the panel is positioned so the source sits at that same fraction across it.
  const fraction = clamp(srcCenter / extent, 0, 1);
  let pos = srcCenter - fraction * size;
  // Keep the source fully inside the panel (only possible when the panel is at
  // least as large as the source): pos in [srcEnd - size, srcStart]. At the
  // bounds this is exactly the edge anchoring of origin-left/right.
  if (size >= srcSize) {
    pos = clamp(pos, srcStart + srcSize - size, srcStart);
  }
  const max = Math.max(margin, extent - size - margin);
  return clamp(pos, margin, max);
}

/**
 * Resting frame for an origin-family transition (`origin`, `origin-top`,
 * `origin-bottom`, `origin-left`, `origin-right`, `origin-auto`).
 *
 * The target keeps the size, border-radius, background and padding it measured
 * at its natural layout (those stay CSS-owned); only its POSITION is rebased so
 * the panel grows out of the source instead of jumping to wherever the document
 * flow centers it. `placement` picks the growth direction (see
 * {@link ORIGIN_ANCHORS}). `"origin-auto"` is special: it flips up/down on the
 * MAIN axis by available room (see {@link resolveAutoDirection}) and aligns its
 * CROSS axis proportionally (see {@link placeAxisProportional}), so it opens
 * centered when the source is central and leans to the opposite side when the
 * source is near an edge. Every result is then shifted to stay within the
 * viewport margins, so the panel can never spill off-screen regardless of where
 * the source sits or how large the panel is.
 *
 * Pure and side-effect free: the input geometries are never mutated, a fresh
 * one is returned, and the viewport is passed in (read by the caller — once at
 * open time, again on each viewport change) so this stays testable and free of
 * any global access.
 */
export function resolveOriginGeometry(
  placement: Placement,
  sourceGeo: ElementGeometry,
  naturalGeo: ElementGeometry,
  viewport: { width: number; height: number },
  margin: number,
): ElementGeometry {
  const { width, height } = naturalGeo.rect;
  const src = sourceGeo.rect;

  let x: number;
  let y: number;
  if (placement === "origin-auto") {
    // Main axis (vertical): anchor to the top/bottom edge with the most room.
    // Cross axis (horizontal): proportional, so it leans to the opposite side
    // near an edge and stays centered when the source is central.
    const vSide = resolveAutoDirection(src, viewport, margin);
    x = placeAxisProportional(src.x, src.width, width, viewport.width, margin);
    y = placeAxis(
      ORIGIN_ANCHORS[vSide].y,
      src.y,
      src.height,
      height,
      viewport.height,
      margin,
    );
  } else {
    const anchor =
      ORIGIN_ANCHORS[placement as DirectionalPlacement] ??
      ORIGIN_ANCHORS.origin;
    x = placeAxis(anchor.x, src.x, src.width, width, viewport.width, margin);
    y = placeAxis(anchor.y, src.y, src.height, height, viewport.height, margin);
  }

  return { ...naturalGeo, rect: { x, y, width, height } };
}
