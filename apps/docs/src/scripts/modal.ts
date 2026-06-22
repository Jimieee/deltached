import { createDeltachedTransition, type Placement } from "deltached";
import { lockScroll, unlockScroll } from "./smooth-scroll";

/** Selector for everything that can hold keyboard focus inside the panel. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Open overlays, deepest last. Nested morphs (a custom select opened from
 * inside a form modal) push onto this so Escape and the focus trap only act on
 * the topmost dialog — closing the select leaves the form open behind it.
 */
const modalStack: HTMLElement[] = [];

function pushModal(root: HTMLElement): void {
  const i = modalStack.indexOf(root);
  if (i !== -1) modalStack.splice(i, 1);
  modalStack.push(root);
}

function popModal(root: HTMLElement): void {
  const i = modalStack.indexOf(root);
  if (i !== -1) modalStack.splice(i, 1);
}

function isTopModal(root: HTMLElement): boolean {
  return modalStack[modalStack.length - 1] === root;
}

/**
 * Wires a `[data-modal]` overlay to a deltached morph transition: the trigger
 * button is the source, the panel is the morphing target, and the backdrop
 * fades in sync. deltached owns the animation + visibility; this controller
 * owns the modal concerns native <dialog> used to give us for free — scroll
 * lock, focus trap, Escape, restore-focus.
 *
 * Returns a teardown so callers can dispose listeners on SPA navigation.
 */
export function setupModal(root: HTMLElement): () => void {
  const panel = root.querySelector<HTMLElement>("[data-modal-panel]");
  const backdrop = root.querySelector<HTMLElement>("[data-modal-backdrop]");
  if (!panel) return () => {};

  const triggers = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-modal-open="${root.id}"]`),
  );

  let lastFocused: HTMLElement | null = null;

  // Chromeless popovers (custom selects, dropdown menus) are small and should
  // feel like a crisp grow from the trigger — snappy, no content blur, no
  // backdrop dim. Full dialogs keep the slower, softer morph.
  const isPopover = root.classList.contains("modal--bare");
  const timings = isPopover
    ? {
        enterDuration: 0.34,
        leaveDuration: 0.24,
        contentBlur: 0,
        contentFadeFraction: 0.55,
        backdropOpacity: 0,
      }
    : // Dialogs: a lighter content blur than the 12px default — enough to soften
      // the crossfade without the heavy "frosted overlay" look on text/forms.
      { enterDuration: 0.55, leaveDuration: 0.45, contentBlur: 5 };

  const transition = createDeltachedTransition({
    target: panel,
    backdrop,
    timings,
    // Opt-in shared-element continuity: any descendant of the trigger AND the
    // panel that carry the same `data-deltached-id` fly between the two
    // layouts as their own layer (image, text, surface…) instead of merely
    // crossfading. No matching ids on a modal → zero cost, identical behavior.
    persist: {},
    hooks: {
      beforeEnter() {
        root.hidden = false;
        lockScroll();
      },
      afterEnter() {
        focusFirst();
      },
      afterLeave() {
        root.hidden = true;
        popModal(root);
        unlockScroll();
        lastFocused?.focus();
        lastFocused = null;
      },
    },
  });

  // A modal may contain other modals (a custom select inside a form). Their
  // `[data-modal-close]` / focusable descendants belong to the INNER modal, not
  // this one — without this scoping every ancestor modal would also claim them,
  // so picking a nested option would close the whole stack at once.
  const ownsNode = (node: Element): boolean =>
    node.closest("[data-modal]") === root;

  function focusables(): HTMLElement[] {
    return Array.from(panel!.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      ownsNode,
    );
  }

  function focusFirst(): void {
    const first = focusables()[0];
    (first ?? panel!).focus();
  }

  function open(from: HTMLElement, placement?: Placement): void {
    if (transition.isOpen || transition.phase === "entering") return;
    lastFocused = document.activeElement as HTMLElement | null;
    pushModal(root);
    void transition.enter({ from, placement });
  }

  function close(): void {
    void transition.leave();
  }

  // A trigger may declare `data-modal-placement` (e.g. "origin",
  // "origin-bottom") to open the panel anchored to itself instead of centered;
  // "center" or an absent attribute falls back to the transition's default.
  const onTriggerClick = (event: Event) => {
    const trigger = event.currentTarget as HTMLElement;
    const attr = trigger.dataset.modalPlacement;
    const placement =
      attr && attr !== "center" ? (attr as Placement) : undefined;
    open(trigger, placement);
  };
  triggers.forEach((t) => t.addEventListener("click", onTriggerClick));

  const closers = Array.from(
    root.querySelectorAll<HTMLElement>("[data-modal-close]"),
  ).filter(ownsNode);
  closers.forEach((c) => c.addEventListener("click", close));
  backdrop?.addEventListener("click", close);

  // Escape closes; Tab is trapped inside the panel while open. Only the topmost
  // overlay reacts, so Escape peels one nested layer at a time.
  const onKeydown = (event: KeyboardEvent) => {
    if (root.hidden || !isTopModal(root)) return;

    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== "Tab") return;

    const items = focusables();
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", onKeydown);

  return () => {
    triggers.forEach((t) => t.removeEventListener("click", onTriggerClick));
    closers.forEach((c) => c.removeEventListener("click", close));
    backdrop?.removeEventListener("click", close);
    document.removeEventListener("keydown", onKeydown);
    transition.destroy();
    popModal(root);
    unlockScroll();
  };
}

/** Initializes every modal on the page; returns a single teardown for all. */
export function initModals(): () => void {
  const teardowns = Array.from(
    document.querySelectorAll<HTMLElement>("[data-modal]"),
  ).map((root) => setupModal(root));

  return () => teardowns.forEach((dispose) => dispose());
}
