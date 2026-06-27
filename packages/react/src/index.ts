export { useDeltached } from "./useDeltached";
export type { UseDeltachedOptions, UseDeltachedReturn } from "./useDeltached";

// Re-export the core's public types so consumers can stay on a single import.
export type {
  DeltachedHooks,
  DeltachedTimings,
  EnterOptions,
  Placement,
  TransitionPhase,
} from "deltached";
