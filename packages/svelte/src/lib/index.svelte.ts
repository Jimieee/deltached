import type { Attachment } from "svelte/attachments";
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
   * The reveal is imperative and synchronous, which `{#if}`/CSS cannot
   * guarantee. Set `false` to manage visibility yourself via `hooks`.
   * Defaults to `true`.
   */
  autoHide?: boolean;
}

export interface UseDeltachedReturn {
  /** Attach to the morphing/destination element: `{@attach target}` (required). */
  target: Attachment<HTMLElement>;
  /** Attach to the trigger the target grows from (optional). */
  source: Attachment<HTMLElement>;
  /** Attach to a backdrop faded in sync with the morph (optional). */
  backdrop: Attachment<HTMLElement>;
  /** Morph the source into the target. Resolves `false` if it was a no-op. */
  enter: (options?: EnterOptions) => Promise<boolean>;
  /** Morph the target back onto the source. */
  leave: () => Promise<boolean>;
  /** Enter when idle/closed, leave when open/entering. */
  toggle: (options?: EnterOptions) => void;
  /** Reactive lifecycle phase: `idle | entering | open | leaving`. */
  readonly phase: TransitionPhase;
  /** `true` once the enter has settled, until a leave starts. */
  readonly isOpen: boolean;
  /** `true` while a morph is in flight. */
  readonly isAnimating: boolean;
  /** The underlying controller, or `null` before the target mounts. */
  readonly controller: DeltachedTransition | null;
}

/**
 * Svelte binding for deltached. Call it from a component's `<script>`: the
 * controller is created when the `target` attachment runs and destroyed when
 * the element (or component) is removed, so it follows the component lifecycle.
 */
export function useDeltached(
  options: UseDeltachedOptions = {},
): UseDeltachedReturn {
  let targetNode = $state<HTMLElement | null>(null);
  let sourceNode: HTMLElement | null = null;
  let backdropNode: HTMLElement | null = null;
  let controller = $state<DeltachedTransition | null>(null);
  let phase = $state<TransitionPhase>("idle");

  const target: Attachment<HTMLElement> = (node) => {
    if (options.autoHide ?? true) node.hidden = true;
    targetNode = node;
    return () => {
      if (targetNode === node) targetNode = null;
    };
  };
  const source: Attachment<HTMLElement> = (node) => {
    sourceNode = node;
    return () => {
      if (sourceNode === node) sourceNode = null;
    };
  };
  const backdrop: Attachment<HTMLElement> = (node) => {
    backdropNode = node;
    return () => {
      if (backdropNode === node) backdropNode = null;
    };
  };

  $effect(() => {
    const element = targetNode;
    if (!element) {
      controller = null;
      return;
    }

    const autoHide = options.autoHide ?? true;
    const instance = createDeltachedTransition({
      target: element,
      source: sourceNode,
      backdrop: backdropNode,
      content: options.content,
      timings: options.timings,
      placement: options.placement,
      placementMargin: options.placementMargin,
      persist: options.persist,
      hooks: {
        beforeEnter: () => {
          if (autoHide) element.hidden = false;
          phase = "entering";
          options.hooks?.beforeEnter?.();
        },
        afterEnter: () => {
          phase = "open";
          options.hooks?.afterEnter?.();
        },
        beforeLeave: () => {
          phase = "leaving";
          options.hooks?.beforeLeave?.();
        },
        afterLeave: () => {
          phase = "idle";
          options.hooks?.afterLeave?.();
          if (autoHide) element.hidden = true;
        },
      },
    });

    controller = instance;
    return () => {
      instance.destroy();
      if (controller === instance) controller = null;
    };
  });

  const enter = (enterOptions?: EnterOptions): Promise<boolean> => {
    if (!controller) return Promise.resolve(false);
    return controller.enter({
      from: sourceNode ?? undefined,
      ...enterOptions,
    });
  };

  const leave = (): Promise<boolean> => {
    return controller?.leave() ?? Promise.resolve(false);
  };

  const toggle = (enterOptions?: EnterOptions): void => {
    const instance = controller;
    if (!instance) return;
    if (instance.isOpen || instance.phase === "entering") {
      void instance.leave();
    } else {
      void enter(enterOptions);
    }
  };

  return {
    target,
    source,
    backdrop,
    enter,
    leave,
    toggle,
    get phase() {
      return phase;
    },
    get isOpen() {
      return phase === "open";
    },
    get isAnimating() {
      return phase === "entering" || phase === "leaving";
    },
    get controller() {
      return controller;
    },
  };
}

export type {
  DeltachedHooks,
  DeltachedTimings,
  EnterOptions,
  Placement,
  TransitionPhase,
} from "deltached";
