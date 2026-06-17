import { gsap } from "gsap";

/**
 * Copy-to-clipboard buttons with an optional icon morph.
 *
 * Markup contract (everything but `data-copy` is optional):
 *
 *   <button data-copy="text to copy" data-copy-duration="1.15">
 *     <span data-copy-icon="copy">…</span>   // resting icon
 *     <span data-copy-icon="check">…</span>  // success icon
 *   </button>
 *
 * The button gets `data-copied="true"` while the success state is showing, so
 * CSS can style it without knowing anything about the animation. When both
 * icons are present we cross-fade them; otherwise we just toggle the state for
 * the hold duration. Nothing here is specific to install commands — any button
 * that carries `data-copy` is wired up.
 */

const SELECTOR = "[data-copy]:not([data-copy-ready])";

/** Seconds the success state lingers before reverting. */
const DEFAULT_HOLD = 1.15;

const HIDDEN = { autoAlpha: 0, scale: 0.72, filter: "blur(6px)" } as const;
const SHOWN = { autoAlpha: 1, scale: 1, filter: "blur(0px)" } as const;

function getNumberAttribute(
  element: HTMLElement,
  attribute: string,
  fallback: number,
) {
  const value = Number(element.dataset[attribute]);

  return Number.isFinite(value) ? value : fallback;
}

function wireButton(button: HTMLButtonElement): () => void {
  const text = button.dataset.copy ?? "";

  const copyIcon = button.querySelector<HTMLElement>('[data-copy-icon="copy"]');
  const checkIcon = button.querySelector<HTMLElement>(
    '[data-copy-icon="check"]',
  );

  button.dataset.copyReady = "true";

  const originalLabel = button.getAttribute("aria-label");
  const hold = getNumberAttribute(button, "copyDuration", DEFAULT_HOLD);

  // When the markup supplies both icons we play the morph; otherwise the
  // feedback is purely the `data-copied` state toggled below.
  const timeline =
    copyIcon && checkIcon
      ? buildIconTimeline(copyIcon, checkIcon, hold)
      : null;

  let resetTimer: number | undefined;

  const markCopied = () => {
    button.dataset.copied = "true";
    if (originalLabel) button.setAttribute("aria-label", "Copied to clipboard");
  };

  const reset = () => {
    delete button.dataset.copied;
    if (originalLabel) button.setAttribute("aria-label", originalLabel);
  };

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Could not copy to clipboard:", error);
      return;
    }

    if (timeline) {
      timeline.restart();
    } else {
      window.clearTimeout(resetTimer);
      markCopied();
      resetTimer = window.setTimeout(reset, hold * 1000);
    }
  };

  if (timeline) {
    timeline.eventCallback("onStart", markCopied);
    timeline.eventCallback("onComplete", reset);
  }

  button.addEventListener("click", onClick);

  return () => {
    button.removeEventListener("click", onClick);
    window.clearTimeout(resetTimer);
    timeline?.kill();
    delete button.dataset.copyReady;
    reset();
  };
}

function buildIconTimeline(
  copyIcon: HTMLElement,
  checkIcon: HTMLElement,
  hold: number,
): gsap.core.Timeline {
  gsap.set(copyIcon, SHOWN);
  gsap.set(checkIcon, HIDDEN);

  return gsap
    .timeline({ paused: true })
    .to(copyIcon, { ...HIDDEN, duration: 0.18, ease: "power2.in" })
    .to(checkIcon, { ...SHOWN, duration: 0.28, ease: "power3.out" }, "-=0.08")
    .to(
      checkIcon,
      { ...HIDDEN, duration: 0.18, ease: "power2.in" },
      `+=${hold}`,
    )
    .to(copyIcon, { ...SHOWN, duration: 0.28, ease: "power3.out" }, "-=0.08");
}

/** Wires every `[data-copy]` button on the page; returns a single teardown. */
export function initCopyButtons(): () => void {
  const teardowns = Array.from(
    document.querySelectorAll<HTMLButtonElement>(SELECTOR),
  ).map(wireButton);

  return () => teardowns.forEach((dispose) => dispose());
}
