/**
 * Public types for the Deltached transition system.
 */

import type { PersistConfig } from "../persist/types";

export type TransitionPhase = "idle" | "entering" | "open" | "leaving";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Resolved padding (px) for each edge. */
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
}

export interface EnterOptions {
  /** Origin element for this transition; falls back to config.source. */
  from?: HTMLElement;
}
