/**
 * Public types for the Deltached transition system.
 */

import type { PersistConfig } from "../persist/types";

export type TransitionPhase = "idle" | "entering" | "open" | "leaving";

/**
 * Where the target settles when it opens.
 *
 * - `"center"` (default): the target rests wherever its OWN CSS lays it out —
 *   e.g. a flex/grid-centered overlay. Deltached only measures that frame and
 *   morphs the source into it, then hands every inline style back to CSS on
 *   settle. This is the historical behavior; nothing is left positioning the
 *   element afterwards.
 * - origin family (`"origin"`, `"origin-top"`, `"origin-bottom"`,
 *   `"origin-left"`, `"origin-right"`, `"origin-auto"`): the target keeps its
 *   natural SIZE and appearance (still CSS-owned) but is positioned relative to
 *   the source it morphs from, so it visually grows out of the trigger.
 *   `"origin"` grows evenly from the source's center; the directional variants
 *   grow toward that side (e.g. `"origin-bottom"` is a dropdown that grows down,
 *   staying centered on the cross axis); `"origin-auto"` is a vertical dropdown
 *   that anchors to the top/bottom edge and flips up/down toward the side with
 *   more room, live as the viewport changes. The resting
 *   frame is computed from the live source rect and the viewport — at open time
 *   and again on every viewport change — then kept as inline positioning while
 *   open, since CSS cannot reproduce a runtime, per-trigger, viewport-clamped
 *   position. See `placementMargin` for the viewport gutter.
 */
export type Placement =
  | "center"
  | "origin"
  | "origin-top"
  | "origin-bottom"
  | "origin-left"
  | "origin-right"
  | "origin-auto";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** padding (px) for each edge. */
export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Visual snapshot of an element taken during the read phase. */
export interface ElementGeometry {
  rect: Rect;
  borderRadius: string;
  backgroundColor: string;
  /**
   * The element's own padding. Interpolated during the morph so the surface
   * adopts the source's content box at the source end and the target's at the
   * target end — otherwise the (fixed) padding would push in-flow content out
   * of alignment once the box has shrunk onto the source.
   */
  padding: EdgeInsets;
}

/**
 * Lifecycle hooks. The core only measures and animates; anything else
 * (CSS classes, scroll locking, focus management, mounting) belongs here.
 */
export interface DeltachedHooks {
  /** Runs before measurements. Make the target's container visible here. */
  beforeEnter?: () => void;
  /** Runs once the enter transition has fully settled. */
  afterEnter?: () => void;
  /** Runs right before the leave transition starts. */
  beforeLeave?: () => void;
  /**
   * Runs after the target has been reset (same synchronous frame, so nothing
   * intermediate can paint). Hide or unmount the target's container here.
   */
  afterLeave?: () => void;
}

export interface DeltachedTimings {
  enterDuration: number;
  leaveDuration: number;
  enterEase: string;
  leaveEase: string;
  /** Fraction of the duration used to fade target content in/out (0..1). */
  contentFadeFraction: number;
  /**
   * Final fraction of the leave during which the source fades back in while
   * the morph surface fades out on top of it (0..1). This crossfade is what
   * prevents the source from flashing before the transition finishes.
   */
  handoffFraction: number;
  /** Fraction of the duration used for backdrop fades (0..1). */
  backdropFadeFraction: number;
  /** Backdrop opacity while open. */
  backdropOpacity: number;
  /** Max blur (px) on content while morphing. 0 disables filter animation. */
  contentBlur: number;
  /** Fade duration used when prefers-reduced-motion is active. */
  reducedMotionDuration: number;
}

export interface DeltachedConfig {
  /** Destination element. It is also the surface that morphs. */
  target: HTMLElement;
  /** Default origin element. Can be overridden per enter() call. */
  source?: HTMLElement | null;
  /** Optional backdrop faded in/out in sync with the morph. */
  backdrop?: HTMLElement | null;
  /**
   * Elements crossfaded inside the target while it morphs.
   * Defaults to the target's direct children, resolved at each transition.
   */
  content?: HTMLElement[] | (() => HTMLElement[]);
  timings?: Partial<DeltachedTimings>;
  hooks?: DeltachedHooks;
  /**
   * Persisted child elements: descendants of source and target
   * marked with the same attribute value (default `data-deltached-id`) travel
   * between the two layouts as temporary layers while the surface morphs.
   * Omit or pass `false` to disable; the core behaves exactly as before.
   */
  persist?: PersistConfig | false;
  /**
   * Default resting placement for the target (see {@link Placement}).
   * Overridable per call via `enter({ placement })`. Defaults to `"center"`,
   * which leaves positioning entirely to CSS.
   */
  placement?: Placement;
  /**
   * Viewport gutter (px) kept on every edge when an `"origin"`-placed target
   * is clamped on screen. Ignored for `"center"`. Defaults to `16`.
   */
  placementMargin?: number;
}

export interface EnterOptions {
  /** Origin element for this transition; falls back to config.source. */
  from?: HTMLElement;
  /**
   * Resting placement for THIS transition (see {@link Placement}). Overrides
   * `config.placement`. Falls back to it when omitted.
   */
  placement?: Placement;
}
