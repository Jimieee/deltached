/**
 * DOM helpers shared by the built-in adapters when building visual layers.
 *
 * Every layer is split in two nodes so geometry and content can never
 * fight (see `PersistVisualLayer`):
 *
 *   outer — the FRAME: rect (x/y/width/height), overflow clipping,
 *           border-radius, opacity. The frame owns ALL geometry and is
 *           never scaled.
 *   inner — the CONTENT: FLUID (100%/100%) for every non-text built-in,
 *           so it re-lays out at the frame's current size exactly like the
 *           real element would when resized (media via object-fit, wrapper
 *           interiors via their own CSS). Text inners are the exception:
 *           natural size + a small uniform clamped scale.
 */

import type { PersistSnapshot } from "../types";

/**
 * The frame node. Absolutely positioned child of the fixed full-viewport
 * overlay, so x/y map 1:1 to viewport rect coordinates — the same space as
 * the pinned surface. Min/max constraints are lifted so the animated frame
 * geometry always wins. `clip: false` is for text, whose glyph descenders
 * and overhangs paint outside the border box on the real element too.
 */
export function createFrame(
  snapshot: PersistSnapshot,
  clip: boolean,
): HTMLElement {
  const outer = document.createElement("div");
  outer.setAttribute("aria-hidden", "true");
  const s = outer.style;
  s.position = "absolute";
  s.top = "0";
  s.left = "0";
  s.margin = "0";
  s.boxSizing = "border-box";
  s.pointerEvents = "none";
  s.minWidth = "0";
  s.minHeight = "0";
  s.maxWidth = "none";
  s.maxHeight = "none";
  s.overflow = clip ? "hidden" : "visible";
  s.borderRadius = snapshot.computed.borderRadius;
  return outer;
}

/**
 * Locks an inner node's box so nothing in the cloned subtree can fight the
 * layer geometry. `width`/`height` accept px strings, `"100%"` (fluid
 * media inners) or `"auto"` (text height — real wrapping at locked width).
 */
export function lockInner(
  inner: HTMLElement,
  width: string,
  height: string,
): void {
  const s = inner.style;
  s.position = "absolute";
  s.top = "0";
  s.left = "0";
  s.margin = "0";
  s.boxSizing = "border-box";
  s.width = width;
  s.height = height;
  s.minWidth = "0";
  s.minHeight = "0";
  s.maxWidth = "none";
  s.maxHeight = "none";
}

/**
 * Pins every `<img>` in a clone to the exact resource the browser already
 * decoded (`currentSrc`), dropping `srcset`/`sizes` so the overlay can't
 * trigger a fresh request and flash grey mid-flight.
 */
export function pinClonedImages(
  original: HTMLElement,
  clone: HTMLElement,
): void {
  const collect = (root: HTMLElement): HTMLImageElement[] =>
    root instanceof HTMLImageElement
      ? [root]
      : Array.from(root.querySelectorAll("img"));
  const originals = collect(original);
  const clones = collect(clone);
  originals.forEach((img, i) => {
    const c = clones[i];
    if (!c) return;
    const src = img.currentSrc || img.src;
    if (src) {
      c.removeAttribute("srcset");
      c.removeAttribute("sizes");
      c.src = src;
    }
    c.loading = "eager";
    c.decoding = "sync";
  });
}

/**
 * Clones a real element to BE the layer's outer node (no synthetic frame),
 * so all of its own styling — border, ring, box-shadow, padding, overflow,
 * border-radius, background, and any media nested inside — is preserved via
 * its class names (same document, so document CSS still applies) and its
 * inline styles. Only geometry-owning properties are neutralized; the
 * morph engine drives x/y/width/height/borderRadius. `box-sizing:border-box`
 * makes the animated width/height match the measured border-box exactly, so
 * a fixed border (e.g. an 8px avatar ring) stays put while the box resizes.
 */
export function cloneAsLayer(snapshot: PersistSnapshot): HTMLElement {
  const clone = snapshot.element.cloneNode(true) as HTMLElement;
  clone.setAttribute("aria-hidden", "true");
  const s = clone.style;
  s.position = "absolute";
  s.top = "0";
  s.left = "0";
  s.margin = "0";
  s.boxSizing = "border-box";
  s.pointerEvents = "none";
  s.minWidth = "0";
  s.minHeight = "0";
  s.maxWidth = "none";
  s.maxHeight = "none";
  // Box-shadow paints outside the border box and must not be clipped; the
  // clone keeps its own `overflow` (via class/inline) to clip its content.
  pinClonedImages(snapshot.element, clone);
  return clone;
}
