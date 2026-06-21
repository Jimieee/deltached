/**
 * Submit + reset glue for the Forms example. The morph, the open/close and the
 * custom selects are all handled elsewhere — this only stops the demo `<form>`
 * from actually navigating, flips the panel to its success state, and resets it
 * once the dialog closes so reopening starts clean.
 *
 * Wiring:
 *  - `[data-demo-form]`     the form; gets `data-sent` on submit (CSS swaps it
 *                           for the success block)
 *  - the closest `[data-modal]` host is watched: when it hides again, state and
 *    fields reset.
 */
function resetForm(form: HTMLFormElement): void {
  form.removeAttribute("data-sent");
  form.reset();
  // Custom selects keep their value in a hidden input + trigger label, neither
  // of which `form.reset()` restores — clear them by hand.
  form.querySelectorAll<HTMLElement>("[data-cs]").forEach((cs) => {
    const input = cs.querySelector<HTMLInputElement>("[data-cs-input]");
    const labelEl = cs.querySelector<HTMLElement>("[data-cs-label]");
    const trigger = cs.querySelector<HTMLElement>("[data-cs-trigger]");
    const placeholder = labelEl?.dataset.csPlaceholder;
    if (input) input.value = "";
    if (labelEl && placeholder !== undefined) labelEl.textContent = placeholder;
    trigger?.removeAttribute("data-cs-filled");
  });
}

export function initFormsDemo(): () => void {
  const forms = Array.from(
    document.querySelectorAll<HTMLFormElement>("[data-demo-form]"),
  );
  const observers: MutationObserver[] = [];

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    form.setAttribute("data-sent", "");
  };

  forms.forEach((form) => {
    form.addEventListener("submit", onSubmit);

    // Snapshot each select's placeholder so a reset can restore it.
    form.querySelectorAll<HTMLElement>("[data-cs-label]").forEach((labelEl) => {
      if (labelEl.dataset.csPlaceholder === undefined) {
        labelEl.dataset.csPlaceholder = labelEl.textContent?.trim() ?? "";
      }
    });

    const host = form.closest<HTMLElement>("[data-modal]");
    if (!host) return;
    const observer = new MutationObserver(() => {
      if (host.hidden) resetForm(form);
    });
    observer.observe(host, { attributes: true, attributeFilter: ["hidden"] });
    observers.push(observer);
  });

  return () => {
    forms.forEach((form) => form.removeEventListener("submit", onSubmit));
    observers.forEach((observer) => observer.disconnect());
  };
}
