/**
 * canvas — bitmap snapshot animated like an image; tainted canvases
 * never crash (dropped at capture, real element left untouched).
 */

import { animatePersistPair } from "../flight";
import { readSnapshotCore } from "../measure";
import type {
  PersistAdapter,
  PersistSnapshot,
  PersistVisualLayer,
} from "../types";
import { createFrame, lockInner } from "./shared";

export const canvasAdapter: PersistAdapter = {
  kind: "canvas",

  capture(el, ctx) {
    const { rect, computed } = readSnapshotCore(el);
    let canvas: PersistSnapshot["canvas"] = null;
    if (el instanceof HTMLCanvasElement) {
      try {
        canvas = {
          dataUrl: el.toDataURL(),
          width: el.width,
          height: el.height,
        };
      } catch {
        canvas = null; // tainted — handled by the capture orchestrator
      }
    }
    return { id: ctx.id, kind: ctx.kind, element: el, rect, computed, canvas };
  },

  createLayer(snapshot): PersistVisualLayer {
    const outer = createFrame(snapshot, true);
    outer.style.backgroundColor = snapshot.computed.backgroundColor;
    const img = document.createElement("img");
    if (snapshot.canvas) img.src = snapshot.canvas.dataUrl;
    img.alt = "";
    img.draggable = false;
    img.style.display = "block";
    // A canvas stretches its bitmap to the element box; "fill" matches.
    img.style.objectFit = "fill";
    lockInner(img, "100%", "100%");
    outer.appendChild(img);
    return { outer, inner: img };
  },

  animate(pair, layers, ctx) {
    const single =
      !!pair.from &&
      !!pair.to &&
      pair.from.canvas?.dataUrl === pair.to.canvas?.dataUrl;
    animatePersistPair(pair, layers, ctx, {
      strategy: "rect",
      handoff: single ? { enabled: false } : undefined,
    });
  },
};
