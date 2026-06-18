import { initCopyButtons } from "./copy-button";
import {
  destroyFontWeightProximity,
  initFontWeightProximity,
} from "./font-weight-proximity";
import { initModals } from "./modal";
import { initScrollbar } from "./scrollbar";
import { initSmoothScroll } from "./smooth-scroll";

let teardownModals: (() => void) | null = null;
let teardownCopyButtons: (() => void) | null = null;
let teardownSmoothScroll: (() => void) | null = null;
let teardownScrollbar: (() => void) | null = null;

function initPage() {
  // Smooth scroll first — the custom scrollbar reads its instance.
  teardownSmoothScroll = initSmoothScroll();
  teardownScrollbar = initScrollbar();
  initFontWeightProximity();
  teardownModals = initModals();
  teardownCopyButtons = initCopyButtons();
}

function destroyPage() {
  destroyFontWeightProximity();
  teardownModals?.();
  teardownModals = null;
  teardownCopyButtons?.();
  teardownCopyButtons = null;
  teardownScrollbar?.();
  teardownScrollbar = null;
  teardownSmoothScroll?.();
  teardownSmoothScroll = null;
}

initPage();

document.addEventListener("astro:page-load", initPage);
document.addEventListener("astro:before-swap", destroyPage);
