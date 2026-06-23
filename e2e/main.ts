import { createDeltachedTransition } from "deltached";
import { exposeTestHandle } from "./shared/handle";

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

exposeTestHandle(transition);
