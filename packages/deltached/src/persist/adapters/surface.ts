/**
 * surface — generic fallback for divs/spans without special media.
 */

import { animatePersistPair } from "../flight";
import { readSnapshotCore } from "../measure";
import type { PersistAdapter, PersistVisualLayer } from "../types";
import { cloneAsLayer } from "./shared";

export const surfaceAdapter: PersistAdapter = {
  kind: "surface",

  capture(el, ctx) {
    const { rect, computed } = readSnapshotCore(el);
    // Text content is captured only as a "can pile up" hint for the blend
    // choice — a surface that renders text (a label, a heading) must
    // dissolve so the old text fades out instead of overlapping the new.
    return {
      id: ctx.id,
      kind: ctx.kind,
      element: el,
      rect,
      computed,
      text: (el.textContent ?? "").trim(),
    };
  },

  createLayer(snapshot): PersistVisualLayer {
    // The clone IS the layer: it keeps every box style it already had
    // (border/ring, box-shadow, padding, overflow, radius, background) and
    // its nested media, so the layer is visually identical to the real
    // element instead of a stripped-down frame. The morph engine animates
    // the clone's own box; its interior re-lays out per its own CSS at each
    // size — exactly what the real element would do when resized. No scale,
    // no stretch, no lost styles. Both endpoints are exact by construction.
    const clone = cloneAsLayer(snapshot);
    return { outer: clone, inner: clone };
  },

  animate(pair, layers, ctx) {
    // Frame-only geometry. "rect" is the only strategy safe for MIXED pairs
    // (e.g. a bare image on one side, a wrapper surface on the other): it
    // never scales an inner, so nothing can be double-transformed.
    //
    // Blend choice — DISSOLVE (old fades out mid-path) whenever the two
    // sides could visibly pile up, so no style or content ever overlaps:
    //   - decoration differs (border, ring, box-shadow, outline) — e.g. a
    //     white-shadow source avatar into a dark 8px-bordered destination;
    //   - the surface renders text (a label/heading) — two copies at
    //     different sizes/positions would otherwise double up.
    // Otherwise (pure media, matching decoration — e.g. a cover image)
    // COVER keeps the old layer opaque underneath and avoids any dip.
    const decoChanged =
      pair.from?.computed.decoration !== pair.to?.computed.decoration;
    const hasText = !!(pair.from?.text || pair.to?.text);
    const pilesUp = !!pair.from && !!pair.to && (decoChanged || hasText);
    animatePersistPair(pair, layers, ctx, {
      strategy: "rect",
      blend: pilesUp ? "dissolve" : "cover",
    });
  },
};
