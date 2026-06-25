import { initCodeTabs } from "./code-tabs";
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
import { initTheme } from "./theme";

let teardownModals: (() => void) | null = null;
let teardownCopyButtons: (() => void) | null = null;
let teardownCustomSelects: (() => void) | null = null;
let teardownFormsDemo: (() => void) | null = null;
let teardownSmoothScroll: (() => void) | null = null;
let teardownScrollbar: (() => void) | null = null;
let teardownNav: (() => void) | null = null;
let teardownCodeTabs: (() => void) | null = null;
let teardownTheme: (() => void) | null = null;

initNavRouteTransitions();

// Per-page wiring. With the ClientRouter this runs on the initial load and
// after every navigation (astro:page-load), and is torn down before each swap.
// The nav is re-rendered (not persisted) each page, so it always starts clean.
function initPage() {
  // Smooth scroll first — the custom scrollbar reads its instance.
  teardownSmoothScroll = initSmoothScroll();
  teardownScrollbar = initScrollbar();
  teardownNav = initNav();
  teardownTheme = initTheme();
  initFontWeightProximity();
  teardownModals = initModals();
  teardownCustomSelects = initCustomSelects();
  teardownFormsDemo = initFormsDemo();
  teardownCopyButtons = initCopyButtons();
  teardownCodeTabs = initCodeTabs();
}

function destroyPage() {
  destroyFontWeightProximity();
  teardownModals?.();
  teardownModals = null;
  teardownCopyButtons?.();
  teardownCopyButtons = null;
  teardownCodeTabs?.();
  teardownCodeTabs = null;
  teardownCustomSelects?.();
  teardownCustomSelects = null;
  teardownFormsDemo?.();
  teardownFormsDemo = null;
  teardownNav?.();
  teardownNav = null;
  teardownTheme?.();
  teardownTheme = null;
  teardownScrollbar?.();
  teardownScrollbar = null;
  teardownSmoothScroll?.();
  teardownSmoothScroll = null;
}

document.addEventListener("astro:page-load", initPage);
document.addEventListener("astro:before-swap", destroyPage);
