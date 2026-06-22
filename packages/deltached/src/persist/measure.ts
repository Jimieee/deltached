/**
 * Read-only collection, capture and matching for persisted child elements.
 * Everything here reads layout/styles and must run inside the controller's
 * grouped read phase, before any write touches the DOM.
 */

import { resolveBorderRadius } from "../core/measure";
import type {
  PersistCaptureContext,
  PersistComputedStyles,
  PersistContextBase,
  PersistPair,
  PersistSnapshot,
  ResolvedPersistConfig,
} from "./types";
import type { Rect } from "../core/types";

/**
 * Collects the persisted candidates of one root, keyed by their match id.
 *
 * - `querySelectorAll` never returns the root itself, so the morphing
 *   surface can't be its own persisted child by construction.
 * - Duplicate ids keep the first element in DOM order (debug warn).
 * - Candidates nested inside another persisted candidate are dropped: the
 *   outer layer already carries the inner content, so a second inner layer
 *   would paint it twice (debug warn).
 */
export function collectPersistCandidates(
  root: HTMLElement,
  resolved: ResolvedPersistConfig,
  warn: (message: string) => void,
): Map<string, HTMLElement> {
  const { attribute, selector } = resolved;
  const out = new Map<string, HTMLElement>();
  for (const el of root.querySelectorAll<HTMLElement>(selector)) {
    const id = el.getAttribute(attribute);
    if (!id) {
      warn(`selector matched an element without ${attribute}; skipped.`);
      continue;
    }
    if (out.has(id)) {
      warn(`duplicate ${attribute}="${id}" in one root; keeping the first.`);
      continue;
    }
    const ancestor = el.parentElement?.closest<HTMLElement>(`[${attribute}]`);
    if (ancestor && ancestor !== root && root.contains(ancestor)) {
      warn(
        `"${id}" is nested inside persisted "${ancestor.getAttribute(
          attribute,
        )}"; skipped (the outer layer already carries it).`,
      );
      continue;
    }
    out.set(id, el);
  }
  return out;
}

/** Common read of one element: rect + the always-captured computed base. */
export function readSnapshotCore(el: HTMLElement): {
  rect: Rect;
  style: CSSStyleDeclaration;
  computed: PersistComputedStyles;
} {
  const r = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const rect: Rect = { x: r.left, y: r.top, width: r.width, height: r.height };
  return {
    rect,
    style,
    computed: {
      opacity: style.opacity,
      transform: style.transform,
      overflow: style.overflow,
      clipPath: style.clipPath,
      borderRadius: resolveBorderRadius(style, rect),
      backgroundColor: style.backgroundColor,
      boxShadow: style.boxShadow,
      // A signature of all four borders + outline: used to detect whether a
      // surface's decoration changes between the two sides (→ dissolve so
      // the old ring/shadow never piles on top of the new one).
      decoration:
        `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor};` +
        `${style.borderRightWidth} ${style.borderRightStyle} ${style.borderRightColor};` +
        `${style.borderBottomWidth} ${style.borderBottomStyle} ${style.borderBottomColor};` +
        `${style.borderLeftWidth} ${style.borderLeftStyle} ${style.borderLeftColor};` +
        `${style.outlineWidth} ${style.outlineStyle} ${style.outlineColor};` +
        `${style.boxShadow}`,
    },
  };
}

/**
 * Captures every persisted candidate of a root through its adapter.
 * A snapshot is discarded (never crashing the transition) when:
 * - its rect is zero-sized (hidden by the consumer — nothing to fly);
 * - it is a tainted canvas (`snapshot.canvas === null`): a cloned canvas
 *   paints blank, so the only honest fallback is leaving the real element
 *   riding inside the surface, unhidden.
 */
export function capturePersistSnapshots(
  root: HTMLElement,
  base: PersistContextBase & { role: PersistCaptureContext["role"] },
  resolved: ResolvedPersistConfig,
): PersistSnapshot[] {
  const out: PersistSnapshot[] = [];
  for (const [id, el] of collectPersistCandidates(root, resolved, base.warn)) {
    const kind = resolved.classify(el);
    if (kind === "custom" && !resolved.customProvided) {
      base.warn(
        `"${id}" classified as "custom" but no persist.adapters.custom was provided; using the surface fallback.`,
      );
    }
    const adapter = resolved.adapters[kind];
    const ctx: PersistCaptureContext = { ...base, root, id, kind };
    const snapshot = { ...adapter.capture(el, ctx), id };
    if (snapshot.rect.width <= 0 || snapshot.rect.height <= 0) {
      base.warn(
        `"${id}" has a zero-sized rect on the ${base.role} side; skipped.`,
      );
      continue;
    }
    if (snapshot.kind === "canvas" && snapshot.canvas === null) {
      base.warn(`"${id}" is a tainted canvas; left in place without a layer.`);
      continue;
    }
    out.push(snapshot);
  }
  return out;
}

/**
 * Matches snapshots by id. `from` is always the old visual state and `to`
 * the new one (the session captures them in that order per direction), so
 * adapters always animate from → to regardless of enter/leave.
 */
export function pairPersistSnapshots(
  from: PersistSnapshot[],
  to: PersistSnapshot[],
): PersistPair[] {
  const toById = new Map(to.map((s) => [s.id, s]));
  const pairs: PersistPair[] = [];
  for (const f of from) {
    const t = toById.get(f.id);
    if (t) toById.delete(f.id);
    pairs.push({
      id: f.id,
      // Mixed kinds degrade to "surface": geometry/opacity-only animation
      // composes safely with layers built by any adapter.
      kind: t && t.kind !== f.kind ? "surface" : f.kind,
      from: f,
      to: t,
    });
  }
  for (const t of toById.values()) {
    pairs.push({ id: t.id, kind: t.kind, to: t });
  }
  return pairs;
}
