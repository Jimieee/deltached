import {
  destroyFontWeightProximity,
  initFontWeightProximity,
} from "./font-weight-proximity";
import { initModals } from "./modal";

let teardownModals: (() => void) | null = null;

function initPage() {
  initFontWeightProximity();
  teardownModals = initModals();
}

function destroyPage() {
  destroyFontWeightProximity();
  teardownModals?.();
  teardownModals = null;
}

initPage();

document.addEventListener("astro:page-load", initPage);
document.addEventListener("astro:before-swap", destroyPage);
