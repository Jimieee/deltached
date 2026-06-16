/**
 * image — dedicated frame/media model: the frame morphs, the bitmap
 * refits via object-fit. Controlled crop, never stretch.
 */

import { animatePersistPair } from "../flight";
import { readSnapshotCore } from "../measure";
import type {
  PersistAdapter,
  PersistSnapshot,
  PersistVisualLayer,
} from "../types";
import { createFrame, lockInner } from "./shared";

const BACKGROUND_STYLE_KEYS = [
  "backgroundImage",
  "backgroundSize",
  "backgroundPosition",
  "backgroundRepeat",
] as const;

/** Same bitmap AND same fitting on both sides → one media is enough. */
function sameImageMedia(from: PersistSnapshot, to: PersistSnapshot): boolean {
  if (from.image && to.image) {
    return (
      from.image.src === to.image.src &&
      from.computed.objectFit === to.computed.objectFit &&
      from.computed.objectPosition === to.computed.objectPosition
    );
  }
  if (!from.image && !to.image) {
    return BACKGROUND_STYLE_KEYS.every(
      (key) => from.computed[key] === to.computed[key],
    );
  }
  return false;
}

export const imageAdapter: PersistAdapter = {
  kind: "image",

  capture(el, ctx) {
    const { rect, style, computed } = readSnapshotCore(el);
    computed.objectFit = style.objectFit;
    computed.objectPosition = style.objectPosition;
    for (const key of BACKGROUND_STYLE_KEYS) computed[key] = style[key];

    const img = el instanceof HTMLImageElement ? el : el.querySelector("img");
    const snapshot: PersistSnapshot = {
      id: ctx.id,
      kind: ctx.kind,
      element: el,
      rect,
      computed,
    };
    if (img) {
      // currentSrc pins the exact resource the browser already decoded —
      // re-evaluating srcset inside the overlay could refetch mid-flight.
      const src = img.currentSrc || img.src;
      if (src) {
        snapshot.image = {
          src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        };
        if (el !== img) {
          // The visual content is the inner <img>; its fit drives the layer.
          const imgStyle = getComputedStyle(img);
          computed.objectFit = imgStyle.objectFit;
          computed.objectPosition = imgStyle.objectPosition;
        }
      }
    } else if (computed.backgroundImage === "none") {
      ctx.warn(
        `"${ctx.id}" classified as image but has no <img> nor background-image.`,
      );
    }
    return snapshot;
  },

  createLayer(snapshot): PersistVisualLayer {
    const c = snapshot.computed;
    // The frame owns rect/clip/radius; the media inside only ever refits.
    const outer = createFrame(snapshot, true);
    outer.style.backgroundColor = c.backgroundColor;
    let inner: HTMLElement;
    if (snapshot.image) {
      const img = document.createElement("img");
      img.src = snapshot.image.src;
      img.alt = "";
      img.draggable = false;
      img.style.display = "block";
      img.style.objectFit = c.objectFit || "fill";
      img.style.objectPosition = c.objectPosition || "50% 50%";
      inner = img;
    } else {
      inner = document.createElement("div");
      const s = inner.style;
      for (const key of BACKGROUND_STYLE_KEYS) {
        const value = c[key];
        if (value !== undefined) s[key] = value;
      }
    }
    // Fluid: the media always fills the frame; object-fit/background-size
    // decide how the bitmap sits in it — the bitmap itself never stretches
    // beyond what the element's own CSS already did.
    lockInner(inner, "100%", "100%");
    outer.appendChild(inner);
    return { outer, inner };
  },

  animate(pair, layers, ctx) {
    // Same bitmap and same fitting: ONE visual media inside one traveling
    // frame (single-clone mode) — the frame morphs A → B, object-fit
    // re-crops smoothly every tick, and no crossfade is needed at all.
    // Different bitmaps: both frames fly the same path (reading as one
    // frame) and the two medias crossfade INSIDE it, centered mid-travel.
    const single =
      !!pair.from && !!pair.to && sameImageMedia(pair.from, pair.to);
    animatePersistPair(pair, layers, ctx, {
      strategy: "rect",
      handoff: single ? { enabled: false } : undefined,
    });
  },
};
