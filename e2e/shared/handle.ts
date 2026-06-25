import {
  MORPHING_ATTRIBUTE,
  prefersReducedMotion,
  type DeltachedTransition,
} from "deltached";

declare global {
  interface Window {
    __deltached: {
      transition: DeltachedTransition;
      MORPHING_ATTRIBUTE: string;
      prefersReducedMotion: typeof prefersReducedMotion;
    };
  }
}

/**
 * Publish the controller for the specs. Every fixture — vanilla and each
 * framework wrapper — exposes the SAME handle, so one spec suite asserts the
 * same behaviour against all of them.
 */
export function exposeTestHandle(transition: DeltachedTransition): void {
  window.__deltached = { transition, MORPHING_ATTRIBUTE, prefersReducedMotion };
}
