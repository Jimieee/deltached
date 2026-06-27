import { useCallback, useEffect, useRef, useState } from "react";
import {
  createDeltachedTransition,
  type DeltachedHooks,
  type DeltachedTimings,
  type DeltachedTransition,
  type EnterOptions,
  type Placement,
  type TransitionPhase,
} from "deltached";

type PersistConfig = NonNullable<
  Parameters<typeof createDeltachedTransition>[0]["persist"]
>;

export interface UseDeltachedOptions {
  /** Default resting placement; overridable per `enter()` call. */
  placement?: Placement;
  /** Viewport gutter (px) kept when an origin-placed target is clamped. */
  placementMargin?: number;
  /** Partial timing overrides merged onto the defaults. */
  timings?: Partial<DeltachedTimings>;
  /** Elements crossfaded inside the target. Defaults to its direct children. */
  content?: HTMLElement[] | (() => HTMLElement[]);
  /** Persisted-children config, or `false` to disable. */
  persist?: PersistConfig | false;
  /** Lifecycle callbacks. */
  hooks?: DeltachedHooks;
  /**
   * Toggle the target's `hidden` attribute around the morph: hidden at rest,
   * revealed before the enter measures, hidden again after the leave resets.
   * The reveal is imperative and synchronous, which a `hidden={!isOpen}` render
   * cannot guarantee. Set `false` to manage visibility yourself via `hooks`.
   * Defaults to `true`.
   */
  autoHide?: boolean;
}

/** Callback ref: pass straight to a JSX `ref` prop. */
type ElementRef = (node: HTMLElement | null) => void;

export interface UseDeltachedReturn {
  /** Attach to the morphing/destination element (required). */
  targetRef: ElementRef;
  /** Attach to the trigger the target grows from (optional). */
  sourceRef: ElementRef;
  /** Attach to a backdrop faded in sync with the morph (optional). */
  backdropRef: ElementRef;
  /** Morph the source into the target. Resolves `false` if it was a no-op. */
  enter: (options?: EnterOptions) => Promise<boolean>;
  /** Morph the target back onto the source. */
  leave: () => Promise<boolean>;
  /** Enter when idle/closed, leave when open/entering. */
  toggle: (options?: EnterOptions) => void;
  /** Reactive lifecycle phase: `idle | entering | open | leaving`. */
  phase: TransitionPhase;
  /** `true` once the enter has settled, until a leave starts. */
  isOpen: boolean;
  /** `true` while a morph is in flight. */
  isAnimating: boolean;
  /** The underlying controller, or `null` before the target mounts. */
  controller: DeltachedTransition | null;
}

/**
 * React binding for deltached. The controller is created when the target mounts
 * and destroyed when it unmounts or changes, so it follows the component
 * lifecycle. Runs only in effects, so it is SSR-safe.
 */
export function useDeltached(
  options: UseDeltachedOptions = {},
): UseDeltachedReturn {
  // Latest options without re-creating the controller every render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const targetNode = useRef<HTMLElement | null>(null);
  const sourceNode = useRef<HTMLElement | null>(null);
  const backdropNode = useRef<HTMLElement | null>(null);

  // `controllerRef` keeps the live instance for the memoized callbacks;
  // `controller` mirrors it as state for the reactive escape hatch.
  const controllerRef = useRef<DeltachedTransition | null>(null);
  const [controller, setController] = useState<DeltachedTransition | null>(
    null,
  );
  const [phase, setPhase] = useState<TransitionPhase>("idle");

  // Only the target's identity drives (re)creation.
  const [targetVersion, setTargetVersion] = useState(0);

  const targetRef = useCallback<ElementRef>((node) => {
    if (node === targetNode.current) return;
    // Hide before paint so the target never flashes while the controller is
    // still being built in the effect below.
    if (node && (optionsRef.current.autoHide ?? true)) node.hidden = true;
    targetNode.current = node;
    setTargetVersion((version) => version + 1);
  }, []);
  const sourceRef = useCallback<ElementRef>((node) => {
    sourceNode.current = node;
  }, []);
  const backdropRef = useCallback<ElementRef>((node) => {
    backdropNode.current = node;
  }, []);

  useEffect(() => {
    const target = targetNode.current;
    if (!target) return;

    const opts = optionsRef.current;
    const autoHide = opts.autoHide ?? true;

    const instance = createDeltachedTransition({
      target,
      source: sourceNode.current,
      backdrop: backdropNode.current,
      content: opts.content,
      timings: opts.timings,
      placement: opts.placement,
      placementMargin: opts.placementMargin,
      persist: opts.persist,
      hooks: {
        beforeEnter: () => {
          if (autoHide) target.hidden = false;
          setPhase("entering");
          optionsRef.current.hooks?.beforeEnter?.();
        },
        afterEnter: () => {
          setPhase("open");
          optionsRef.current.hooks?.afterEnter?.();
        },
        beforeLeave: () => {
          setPhase("leaving");
          optionsRef.current.hooks?.beforeLeave?.();
        },
        afterLeave: () => {
          setPhase("idle");
          optionsRef.current.hooks?.afterLeave?.();
          if (autoHide) target.hidden = true;
        },
      },
    });

    controllerRef.current = instance;
    setController(instance);
    return () => {
      instance.destroy();
      controllerRef.current = null;
      setController(null);
    };
  }, [targetVersion]);

  const enter = useCallback((enterOptions?: EnterOptions) => {
    return (
      controllerRef.current?.enter({
        from: sourceNode.current ?? undefined,
        ...enterOptions,
      }) ?? Promise.resolve(false)
    );
  }, []);

  const leave = useCallback(() => {
    return controllerRef.current?.leave() ?? Promise.resolve(false);
  }, []);

  const toggle = useCallback((enterOptions?: EnterOptions) => {
    const instance = controllerRef.current;
    if (!instance) return;
    if (instance.isOpen || instance.phase === "entering") {
      void instance.leave();
    } else {
      void instance.enter({
        from: sourceNode.current ?? undefined,
        ...enterOptions,
      });
    }
  }, []);

  return {
    targetRef,
    sourceRef,
    backdropRef,
    enter,
    leave,
    toggle,
    phase,
    isOpen: phase === "open",
    isAnimating: phase === "entering" || phase === "leaving",
    controller,
  };
}
