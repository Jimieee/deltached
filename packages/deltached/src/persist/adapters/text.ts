/**
 * text — typography-preserving clones; no rubber, minimal scale.
 */

import { gsap } from "gsap";
import { clamp } from "../../core/math";
import { animatePersistPair } from "../flight";
import { readSnapshotCore } from "../measure";
import type { PersistAdapter, PersistVisualLayer } from "../types";
import { createFrame, lockInner } from "./shared";

const TEXT_STYLE_KEYS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "color",
  "textAlign",
  "whiteSpace",
] as const;

/**
 * Visible text may scale at most this far from its true size. Beyond it
 * the centered crossfade carries the change — scaled type reads as rubber
 * long before bitmaps do.
 */
const MAX_VISIBLE_TEXT_SCALE = 1.2;

export const textAdapter: PersistAdapter = {
  kind: "text",

  capture(el, ctx) {
    const { rect, style, computed } = readSnapshotCore(el);
    for (const key of TEXT_STYLE_KEYS) computed[key] = style[key];
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
    const outer = createFrame(snapshot, false); // never clip glyphs
    const inner = snapshot.element.cloneNode(true) as HTMLElement;
    const s = inner.style;
    for (const key of TEXT_STYLE_KEYS) {
      const value = snapshot.computed[key];
      if (value !== undefined) s[key] = value;
    }
    // Width locked to the real measured width preserves the real wrapping;
    // height stays auto so the type lays out exactly like the original.
    lockInner(inner, `${snapshot.rect.width}px`, "auto");
    s.transformOrigin = "0 0";
    outer.appendChild(inner);
    return { outer, inner };
  },

  animate(pair, layers, ctx) {
    // Text flight: both frames keep their NATURAL size and travel x/y only
    // (no width tween → zero reflow/wrap popping). The type-size gap is
    // bridged on the inners with a small UNIFORM scale driven by the
    // font-size ratio — never box ratios — and hard-clamped: by the time
    // the new text becomes visible (centered window) it is practically at
    // its final size, and it has fully settled well before arrival thanks
    // to the asymptotic geometry ease. Reflow/multiline differences hide
    // inside the crossfade.
    if (pair.from && pair.to && layers.fromLayer && layers.toLayer) {
      const a = pair.from.rect;
      const b = pair.to.rect;
      const fromFont = parseFloat(pair.from.computed.fontSize ?? "") || 0;
      const toFont = parseFloat(pair.to.computed.fontSize ?? "") || 0;
      const ratio = fromFont > 0 && toFont > 0 ? toFont / fromFont : 1;
      const clamped = clamp(
        ratio,
        1 / MAX_VISIBLE_TEXT_SCALE,
        MAX_VISIBLE_TEXT_SCALE,
      );
      // Only worth a warn when the clamp truncates meaningfully — the
      // crossfade absorbs small excesses invisibly.
      if (Math.max(ratio / clamped, clamped / ratio) > 1.1) {
        ctx.warn(
          `"${pair.id}" text size ratio ${ratio.toFixed(2)} is large; scale is clamped to ${clamped.toFixed(2)} and the crossfade carries the change.`,
        );
      }
      const { timeline: tl, duration, geometryEase: ease } = ctx;
      gsap.set(layers.toLayer.outer, {
        width: b.width,
        height: b.height,
        x: a.x,
        y: a.y,
      });
      tl.to(layers.fromLayer.outer, { x: b.x, y: b.y, duration, ease }, 0);
      tl.to(layers.toLayer.outer, { x: b.x, y: b.y, duration, ease }, 0);
      gsap.set(layers.fromLayer.inner, { transformOrigin: "0 0" });
      gsap.set(layers.toLayer.inner, {
        transformOrigin: "0 0",
        scale: 1 / clamped,
      });
      tl.to(layers.fromLayer.inner, { scale: clamped, duration, ease }, 0);
      tl.to(layers.toLayer.inner, { scale: 1, duration, ease }, 0);
    }
    // Glyphs can't cover glyphs — the centered handoff cross-dissolves both.
    animatePersistPair(pair, layers, ctx, {
      strategy: "adapter-custom",
      blend: "dissolve",
    });
  },
};
