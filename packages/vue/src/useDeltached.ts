import {
  computed,
  onScopeDispose,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from "vue";
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
   * The reveal is imperative and synchronous, which `v-show`/`v-if` cannot
   * guarantee. Set `false` to manage visibility yourself via `hooks`.
   * Defaults to `true`.
   */
  autoHide?: boolean;
}

/** Function ref: bind with `:ref="targetRef"`. */
type ElementRef = (node: Element | null) => void;

export interface UseDeltachedReturn {
  /** Bind to the morphing/destination element (required). */
  targetRef: ElementRef;
  /** Bind to the trigger the target grows from (optional). */
  sourceRef: ElementRef;
  /** Bind to a backdrop faded in sync with the morph (optional). */
  backdropRef: ElementRef;
  /** Morph the source into the target. Resolves `false` if it was a no-op. */
  enter: (options?: EnterOptions) => Promise<boolean>;
  /** Morph the target back onto the source. */
  leave: () => Promise<boolean>;
  /** Enter when idle/closed, leave when open/entering. */
  toggle: (options?: EnterOptions) => void;
  /** Reactive lifecycle phase: `idle | entering | open | leaving`. */
  phase: Ref<TransitionPhase>;
  /** `true` once the enter has settled, until a leave starts. */
  isOpen: ComputedRef<boolean>;
  /** `true` while a morph is in flight. */
  isAnimating: ComputedRef<boolean>;
  /** The underlying controller, or `null` before the target mounts. */
  controller: Readonly<Ref<DeltachedTransition | null>>;
}

/**
 * Vue binding for deltached. The controller is created when the target mounts
 * and destroyed when it changes or the owning scope is disposed, so it follows
 * the component lifecycle.
 */
export function useDeltached(
  options: UseDeltachedOptions = {},
): UseDeltachedReturn {
  const targetNode = shallowRef<HTMLElement | null>(null);
  const sourceNode = shallowRef<HTMLElement | null>(null);
  const backdropNode = shallowRef<HTMLElement | null>(null);
  const controller = shallowRef<DeltachedTransition | null>(null);
  const phase = shallowRef<TransitionPhase>("idle");

  const targetRef: ElementRef = (node) => {
    const element = (node as HTMLElement | null) ?? null;
    // Hide before paint so the target never flashes before the controller is
    // built in the watcher below.
    if (element && (options.autoHide ?? true)) element.hidden = true;
    targetNode.value = element;
  };
  const sourceRef: ElementRef = (node) => {
    sourceNode.value = (node as HTMLElement | null) ?? null;
  };
  const backdropRef: ElementRef = (node) => {
    backdropNode.value = (node as HTMLElement | null) ?? null;
  };

  // `flush: "post"` runs after the DOM patch, so source/backdrop refs are set.
  watch(
    targetNode,
    (target, _previous, onCleanup) => {
      if (!target) {
        controller.value = null;
        return;
      }

      const autoHide = options.autoHide ?? true;
      const instance = createDeltachedTransition({
        target,
        source: sourceNode.value,
        backdrop: backdropNode.value,
        content: options.content,
        timings: options.timings,
        placement: options.placement,
        placementMargin: options.placementMargin,
        persist: options.persist,
        hooks: {
          beforeEnter: () => {
            if (autoHide) target.hidden = false;
            phase.value = "entering";
            options.hooks?.beforeEnter?.();
          },
          afterEnter: () => {
            phase.value = "open";
            options.hooks?.afterEnter?.();
          },
          beforeLeave: () => {
            phase.value = "leaving";
            options.hooks?.beforeLeave?.();
          },
          afterLeave: () => {
            phase.value = "idle";
            options.hooks?.afterLeave?.();
            if (autoHide) target.hidden = true;
          },
        },
      });

      controller.value = instance;
      onCleanup(() => {
        instance.destroy();
        if (controller.value === instance) controller.value = null;
      });
    },
    { flush: "post" },
  );

  onScopeDispose(() => {
    controller.value?.destroy();
    controller.value = null;
  });

  const enter = (enterOptions?: EnterOptions): Promise<boolean> => {
    if (!controller.value) return Promise.resolve(false);
    return controller.value.enter({
      from: sourceNode.value ?? undefined,
      ...enterOptions,
    });
  };

  const leave = (): Promise<boolean> => {
    return controller.value?.leave() ?? Promise.resolve(false);
  };

  const toggle = (enterOptions?: EnterOptions): void => {
    const instance = controller.value;
    if (!instance) return;
    if (instance.isOpen || instance.phase === "entering") {
      void instance.leave();
    } else {
      void enter(enterOptions);
    }
  };

  return {
    targetRef,
    sourceRef,
    backdropRef,
    enter,
    leave,
    toggle,
    phase,
    isOpen: computed(() => phase.value === "open"),
    isAnimating: computed(
      () => phase.value === "entering" || phase.value === "leaving",
    ),
    controller,
  };
}
