import { createDeltachedTransition } from "deltached";

/** Selector for everything that can hold keyboard focus inside the panel. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

  const transition = createDeltachedTransition({
    target: panel,
    backdrop,
    timings: { enterDuration: 0.55, leaveDuration: 0.45 },
    hooks: {
      beforeEnter() {
        root.hidden = false;
        document.body.style.overflow = "hidden";
      },
      afterEnter() {
        focusFirst();
      },
      afterLeave() {
        root.hidden = true;
        document.body.style.overflow = "";
        lastFocused?.focus();
        lastFocused = null;
      },
    },
  });

  function focusFirst(): void {
    const first = panel!.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel!).focus();
  }

  function open(from: HTMLElement): void {
    if (transition.isOpen || transition.phase === "entering") return;
    lastFocused = document.activeElement as HTMLElement | null;
    void transition.enter({ from });
  }

  function close(): void {
    void transition.leave();
  }

  const onTriggerClick = (event: Event) =>
    open(event.currentTarget as HTMLElement);
  triggers.forEach((t) => t.addEventListener("click", onTriggerClick));

  const closers = Array.from(
    root.querySelectorAll<HTMLElement>("[data-modal-close]"),
  );
  closers.forEach((c) => c.addEventListener("click", close));
  backdrop?.addEventListener("click", close);

  // Escape closes; Tab is trapped inside the panel while open.
  const onKeydown = (event: KeyboardEvent) => {
    if (root.hidden) return;

    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== "Tab") return;

    const items = Array.from(panel!.querySelectorAll<HTMLElement>(FOCUSABLE));
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
    document.body.style.overflow = "";
  };
}

/** Initializes every modal on the page; returns a single teardown for all. */
export function initModals(): () => void {
  const teardowns = Array.from(
    document.querySelectorAll<HTMLElement>("[data-modal]"),
  ).map((root) => setupModal(root));

  return () => teardowns.forEach((dispose) => dispose());
}
