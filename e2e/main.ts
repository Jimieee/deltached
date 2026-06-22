import {
  createDeltachedTransition,
  MORPHING_ATTRIBUTE,
  prefersReducedMotion,
} from "deltached";

const trigger = document.querySelector<HTMLElement>("#trigger")!;
const panel = document.querySelector<HTMLElement>("#panel")!;
const closeButton = panel.querySelector<HTMLElement>("[data-close]")!;

const transition = createDeltachedTransition({
  target: panel,
  source: trigger,
  hooks: {
    beforeEnter: () => {
      panel.hidden = false;
    },
    afterLeave: () => {
      panel.hidden = true;
    },
  },
});

trigger.addEventListener("click", () => void transition.enter());
closeButton.addEventListener("click", () => void transition.leave());

// Test hook: the specs drive the controller directly through this handle so
// they can await enter()/leave() instead of guessing at animation timing.
declare global {
  interface Window {
    __deltached: {
      transition: typeof transition;
      MORPHING_ATTRIBUTE: string;
      prefersReducedMotion: typeof prefersReducedMotion;
    };
  }
}

window.__deltached = { transition, MORPHING_ATTRIBUTE, prefersReducedMotion };
