/**
 * Built-in adapters for persisted child elements — V2 visual architecture.
 *
 * Each element kind is handled by a dedicated adapter (one file each) rather
 * than one generic algorithm. Every layer is split in two nodes so geometry
 * and content can never fight (see `./shared` and `PersistVisualLayer`): the
 * frame owns ALL geometry and is never scaled; the content is fitted inside
 * it per strategy. The shared flight engine (`../flight`) drives the
 * dual-snapshot handoff.
 *
 * Visual priorities, in order: no stretched bitmaps, no rubbery text, no
 * size overshoot, handoff centered mid-travel (never a late swap), real
 * DOM appearing with no flash. Eye-deception beats mathematical purity.
 */

import type { PersistAdapter, PersistKind } from "../types";
import { canvasAdapter } from "./canvas";
import { imageAdapter } from "./image";
import { surfaceAdapter } from "./surface";
import { textAdapter } from "./text";

/**
 * Default kind classification. Runs inside the read phase (it reads
 * computed style), overridable via `persist.classify`.
 *
 * Only LEAF elements (no child elements) become `image`/`text`: those
 * adapters build a synthetic node that reproduces just the media or the
 * type, and intentionally don't carry surrounding box styling. Any WRAPPER
 * (a `<span><img/></span>` avatar/thumb, a `<figure>`, a card body…) is a
 * `surface` — it is CLONED, so its border, ring, box-shadow, padding,
 * background and the media nested inside are all preserved. This is the
 * answer to "the image ignores the styles around it": wrappers keep them.
 */
export function defaultClassify(el: HTMLElement): PersistKind {
  if (el instanceof HTMLCanvasElement) return "canvas";
  if (el instanceof HTMLImageElement || el instanceof HTMLPictureElement) {
    return "image";
  }
  if (el.childElementCount === 0) {
    if (getComputedStyle(el).backgroundImage !== "none") return "image";
    if ((el.textContent ?? "").trim()) return "text";
  }
  return "surface";
}

/**
 * Default "custom" adapter: the safe surface fallback (visual clone +
 * frame geometry + centered crossfade). Replaced via
 * `persist.adapters.custom`. Complex components (video, iframe, stateful
 * widgets) are never promised as perfect clones — bring a custom adapter
 * for faithful playback.
 */
const customAdapter: PersistAdapter = { ...surfaceAdapter, kind: "custom" };

export const builtinPersistAdapters: Record<PersistKind, PersistAdapter> = {
  surface: surfaceAdapter,
  text: textAdapter,
  image: imageAdapter,
  canvas: canvasAdapter,
  custom: customAdapter,
};
