import {
  destroyFontWeightProximity,
  initFontWeightProximity,
} from "./font-weight-proximity";

function initAnimations() {
  initFontWeightProximity();
}

function destroyAnimations() {
  destroyFontWeightProximity();
}

initAnimations();

document.addEventListener("astro:page-load", initAnimations);
document.addEventListener("astro:before-swap", destroyAnimations);
