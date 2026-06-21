import { initCopyButtons } from "./copy-button";
import { initCustomSelects } from "./custom-select";
import {
  destroyFontWeightProximity,
  initFontWeightProximity,
} from "./font-weight-proximity";
import { initFormsDemo } from "./forms-demo";
import { initModals } from "./modal";
import { initNav, initNavRouteTransitions } from "./nav";
import { initScrollbar } from "./scrollbar";
import { initSmoothScroll } from "./smooth-scroll";

let teardownModals: (() => void) | null = null;
let teardownCopyButtons: (() => void) | null = null;
let teardownCustomSelects: (() => void) | null = null;
let teardownFormsDemo: (() => void) | null = null;
let teardownSmoothScroll: (() => void) | null = null;
let teardownScrollbar: (() => void) | null = null;
let teardownNav: (() => void) | null = null;

initNavRouteTransitions();

// Per-page wiring. With the ClientRouter this runs on the initial load and
// after every navigation (astro:page-load), and is torn down before each swap.
// The nav is re-rendered (not persisted) each page, so it always starts clean.
function initPage() {
  // Smooth scroll first — the custom scrollbar reads its instance.
  teardownSmoothScroll = initSmoothScroll();
  teardownScrollbar = initScrollbar();
  teardownNav = initNav();
  initFontWeightProximity();
  teardownModals = initModals();
  teardownCustomSelects = initCustomSelects();
  teardownFormsDemo = initFormsDemo();
  teardownCopyButtons = initCopyButtons();
}

function destroyPage() {
  destroyFontWeightProximity();
  teardownModals?.();
  teardownModals = null;
  teardownCopyButtons?.();
  teardownCopyButtons = null;
  teardownCustomSelects?.();
  teardownCustomSelects = null;
  teardownFormsDemo?.();
  teardownFormsDemo = null;
  teardownNav?.();
  teardownNav = null;
  teardownScrollbar?.();
  teardownScrollbar = null;
  teardownSmoothScroll?.();
  teardownSmoothScroll = null;
}

document.addEventListener("astro:page-load", initPage);
document.addEventListener("astro:before-swap", destroyPage);
