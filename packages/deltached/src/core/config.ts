import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { isBrowser } from "./dom";
import type { DeltachedTimings } from "./types";

export const ENTER_EASE = "deltached.enter";
export const LEAVE_EASE = "deltached.leave";

/** Spring-like curve for entrances: snappy take-off, soft landing. */
export const ENTER_CURVE =
  "M0,0 C0.305,0.206 0.116,0.667 0.3,0.9 0.394,1.021 0.491,1 1,1";
/** Slightly tighter curve for exits, which should feel faster. */
export const LEAVE_CURVE =
  "M0,0 C0.305,0.206 0.116,0.567 0.3,0.8 0.394,0.921 0.491,1 1,1";

/** Registers a CustomEase once, browser-only, so importing stays SSR-safe. */
export function registerEase(name: string, curve: string): void {
  if (!isBrowser) return;
  gsap.registerPlugin(CustomEase);
  if (!CustomEase.get(name)) CustomEase.create(name, curve);
}

let easesReady = false;

export function ensureEases(): void {
  if (easesReady || !isBrowser) return;
  registerEase(ENTER_EASE, ENTER_CURVE);
  registerEase(LEAVE_EASE, LEAVE_CURVE);
  easesReady = true;
}

export const DEFAULT_TIMINGS: DeltachedTimings = {
  enterDuration: 0.6,
  leaveDuration: 0.6,
  enterEase: ENTER_EASE,
  leaveEase: LEAVE_EASE,
  contentFadeFraction: 0.3,
  handoffFraction: 0.3,
  backdropFadeFraction: 0.55,
  backdropOpacity: 0.2,
  contentBlur: 12,
  reducedMotionDuration: 0.15,
};

const clamp01 = gsap.utils.clamp(0, 1);

export function resolveTimings(
  overrides?: Partial<DeltachedTimings>,
): DeltachedTimings {
  const t = { ...DEFAULT_TIMINGS, ...overrides };
  t.contentFadeFraction = clamp01(t.contentFadeFraction);
  t.handoffFraction = clamp01(t.handoffFraction);
  t.backdropFadeFraction = clamp01(t.backdropFadeFraction);
  return t;
}
