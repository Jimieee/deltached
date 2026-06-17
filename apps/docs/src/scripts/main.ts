import { initCopyButtons } from "./copy-button";
import {
  destroyFontWeightProximity,
  initFontWeightProximity,
} from "./font-weight-proximity";
import { initModals } from "./modal";

let teardownModals: (() => void) | null = null;
let teardownCopyButtons: (() => void) | null = null;

function initPage() {
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
}

initPage();

document.addEventListener("astro:page-load", initPage);
document.addEventListener("astro:before-swap", destroyPage);
