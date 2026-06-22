/**
 * Behaviour for the `<div>`-based custom selects in the Forms example.
 *
 * The visual morph is pure deltached: the trigger is a `[data-modal-open]`
 * button and the option list is a chromeless `[data-modal]` that grows out of
 * it (origin placement). This module only owns the SELECT semantics the morph
 * has no opinion about — reflecting the chosen option back onto the trigger and
 * the hidden form input, and marking the active option — so the popover stays a
 * plain nested morph with no bespoke open/close logic of its own.
 *
 * Wiring (all data attributes, no per-instance JS):
 *  - `[data-cs]`                 root, scopes one select
 *  - `[data-cs-trigger]`         the `[data-modal-open]` button; holds the label
 *  - `[data-cs-label]`           element whose text shows the current value
 *  - `[data-cs-input]`           hidden `<input>` carrying the value to the form
 *  - `[data-cs-option][value]`   option button inside the popover; also a
 *                                `[data-modal-close]` so picking one closes it
 *  - `[data-cs-for]`             on each option/popover, the owning `[data-cs]` id
 */

function selectOption(option: HTMLElement): void {
  const ownerId = option.dataset.csFor;
  const root = ownerId
    ? document.querySelector<HTMLElement>(`[data-cs="${ownerId}"]`)
    : option.closest<HTMLElement>("[data-cs]");
  if (!root) return;

  const value = option.dataset.csOption ?? "";
  // Prefer the option's primary label node so the trigger never inherits the
  // secondary hint text; fall back to the whole option for hint-less options.
  const labelNode = option.querySelector<HTMLElement>("[data-cs-opt-label]");
  const label = (labelNode ?? option).textContent?.trim() ?? value;

  const labelEl = root.querySelector<HTMLElement>("[data-cs-label]");
  const input = root.querySelector<HTMLInputElement>("[data-cs-input]");
  const trigger = root.querySelector<HTMLElement>("[data-cs-trigger]");

  if (labelEl) labelEl.textContent = label;
  if (input) {
    input.value = value;
    // Let any listening form react (e.g. enabling submit) as if it were native.
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
  trigger?.setAttribute("data-cs-filled", "");

  // Reflect the active option for both styling and a11y, scoped to this select.
  const popover = option.closest<HTMLElement>("[data-modal]");
  popover?.querySelectorAll<HTMLElement>("[data-cs-option]").forEach((opt) => {
    const active = opt === option;
    opt.setAttribute("aria-selected", active ? "true" : "false");
    opt.toggleAttribute("data-cs-active", active);
  });
}

export function initCustomSelects(): () => void {
  const onClick = (event: Event) => {
    const option = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-cs-option]",
    );
    if (option) selectOption(option);
  };

  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}
