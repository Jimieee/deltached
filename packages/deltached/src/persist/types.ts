/**
 * Public types for persisted child elements.
 *
 * While the root surface morphs between source and target, descendants of
 * both roots marked with the same attribute value (`data-deltached-id` by
 * default) travel between layouts as temporary layers: the old state is
 * snapshotted, the new state is snapshotted, both fly the same geometric
 * path inside a fixed overlay, and the real elements are revealed again the
 * frame the transition settles. Each element kind (text, image, canvas…)
 * is handled by a dedicated adapter instead of one generic algorithm.
 */

// gsap.* types resolve through GSAP's ambient global namespace — no import.
import type { Rect, DeltachedTimings } from "../core/types";

export const DEFAULT_PERSIST_ATTRIBUTE = "data-deltached-id";

export type PersistKind = "surface" | "text" | "image" | "canvas" | "custom";

/**
 * How a pair's layers travel between the old and the new rect. In every
 * strategy the FRAME (`outer`) owns the geometry — x/y/width/height/radius,
 * never scale — and the content (`inner`) is fitted inside it:
 *
 * - `"rect"`: the frame morphs A → B and the FLUID inner (100%/100%)
 *   re-lays out at the frame's current size — media re-crops via
 *   object-fit, wrapper interiors follow their own CSS. What every
 *   built-in non-text adapter uses; the only strategy that composes
 *   safely in mixed-kind pairs.
 * - `"scale-to-fit"`: the frame morphs A → B and the inner keeps its
 *   NATURAL snapshot size with a UNIFORM width-driven scale (origin
 *   top-left). Only for custom adapters that build natural-size inners —
 *   applying it to a fluid inner double-transforms it past the frame.
 * - `"crossfade-only"`: no geometry travel — each layer sits at its own
 *   real rect and only the handoff blends them.
 * - `"adapter-custom"`: the adapter owns the geometry tweens; the persist
 *   engine only contributes the handoff crossfade and single-sided fades.
 */
export type PersistGeometryStrategy =
  | "rect"
  | "scale-to-fit"
  | "crossfade-only"
  | "adapter-custom";

/**
 * The visual handoff between the two snapshots of a pair: the old layer
 * dominates the start, the new layer dominates the end, and the strong
 * change hides inside a soft central crossfade window.
 */
export interface PersistHandoffConfig {
  /**
   * Default `true`. `false` disables the dual-snapshot blend: only the old
   * layer flies and the real element appears at settle. With the frame
   * owning all geometry this is exact for same-content pairs (the image
   * adapter uses it for same-src media); for differing content it is a
   * degraded single-clone mode.
   */
  enabled?: boolean;
  /** Center of the crossfade window as a fraction of the flight. Default 0.5. */
  at?: number;
  /**
   * Width of the crossfade window as a fraction of the flight. Default
   * 0.22 (→ 39%–61%): the strong change happens mid-travel, where the eye
   * accepts it — never near the end, where it reads as a cut.
   */
  window?: number;
  /** Ease of both opacity ramps. Default `"power2.inOut"`. */
  easing?: string;
  /**
   * Allow the `"scale-to-fit"` strategy (uniform inner scale inside the
   * morphing frame). Default `true`; `false` forces `"rect"`.
   */
  scaleToFit?: boolean;
}

/** Which side of a pair a snapshot/layer represents. */
export type PersistRole = "from" | "to";

export type PersistDirection = "enter" | "leave";

export interface PersistConfig {
  /** Attribute whose value is the match key. Default `"data-deltached-id"`. */
  attribute?: string;
  /**
   * Advanced: CSS selector used to find candidates instead of
   * `[attribute]`. The match key is still read from `attribute`, so
   * selector-matched elements without it are skipped.
   */
  selector?: string;
  /** Default `true`. `false` behaves exactly like `persist` being absent. */
  enabled?: boolean;
  /**
   * Dev diagnostics via `console.warn` (duplicate ids, adapter fallbacks,
   * unusable snapshots). Keep off in production. Default `false`.
   */
  debug?: boolean;
  /** Override or extend the built-in adapters per kind. */
  adapters?: Partial<Record<PersistKind, PersistAdapter>>;
  /** Override the default element-kind classification. */
  classify?: (el: HTMLElement) => PersistKind;
  /**
   * `"clip-to-surface"` (default) clips the layers to the morphing
   * surface's animated silhouette (frame + interpolated radius), so they
   * read as content of the surface. `"allow"` lets them overflow it.
   */
  overflow?: "clip-to-surface" | "allow";
  /** Tuning of the central dual-snapshot crossfade. */
  handoff?: PersistHandoffConfig;
  /**
   * Ease used for every layer geometry tween (frames and inner scales).
   * MUST NOT overshoot (no `back`/`elastic`): an overshooting ease makes a
   * layer momentarily larger than its destination.
   *
   * Default: the surface morph's own ease CLAMPED at 1 — layers track the
   * surface (and its clip window) in perfect sync, minus the overshoot.
   * Using a slower ease here makes layers visibly lag the surface and get
   * cut by the clip-to-surface window; only override with a curve that
   * matches the surface timing.
   */
  geometryEase?: string;
  /** z-index of the temporary overlay. Default 9999. */
  zIndex?: number;
}

/**
 * Computed styles captured during the read phase. A plain string struct —
 * never a live `CSSStyleDeclaration`, which would defeat snapshotting.
 * The always-captured base is required; the rest is filled by the adapter
 * that needs it.
 */
export interface PersistComputedStyles {
  opacity: string;
  /** Diagnostic only — never re-applied (x/y tweens own the transform channel). */
  transform: string;
  overflow: string;
  clipPath: string;
  /** Canonical 8-value px radius — both endpoints interpolate without format jumps. */
  borderRadius: string;
  backgroundColor: string;
  boxShadow: string;
  /** Border + outline + shadow signature; drives surface dissolve-vs-cover. */
  decoration: string;
  // text
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  color?: string;
  textAlign?: string;
  whiteSpace?: string;
  // image / background-image
  objectFit?: string;
  objectPosition?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
}

export interface PersistSnapshot {
  /** Match key (the attribute value). */
  id: string;
  kind: PersistKind;
  /** The real element — hidden during the flight and restored at the end. */
  element: HTMLElement;
  /** Visual box in viewport coordinates (border box, transforms included). */
  rect: Rect;
  computed: PersistComputedStyles;
  /** Trimmed text content (text adapter). */
  text?: string;
  /** Resolved image data (image adapter, `<img>` variant). */
  image?: { src: string; naturalWidth: number; naturalHeight: number };
  /** Bitmap snapshot (canvas adapter); `null` means the canvas was tainted. */
  canvas?: { dataUrl: string; width: number; height: number } | null;
}

/** A matched relation between an old-state and a new-state snapshot. */
export interface PersistPair {
  id: string;
  /**
   * Drives `animate` dispatch. When both sides exist but disagree on kind
   * (same id, different element types), this degrades to `"surface"`, whose
   * animation only touches geometry/opacity and composes with any layer.
   */
  kind: PersistKind;
  from?: PersistSnapshot;
  to?: PersistSnapshot;
}

/**
 * One visual layer, split in two nodes so geometry and content can never
 * fight (mixing animated width/height with scale on one node is what makes
 * layers outgrow their destination):
 *
 * - `outer` — the FRAME: positioned rect (x/y/width/height), overflow
 *   clipping, border-radius, opacity. **Never scaled.**
 * - `inner` — the CONTENT: cloned media/text. object-fit/object-position
 *   for media; uniform scale (top-left origin) only when the adapter
 *   decides; transform-origin.
 *
 * Mandatory endpoint: when the flight settles, the visible layer's outer
 * rect equals the real element's rect, every scale is exactly 1, and the
 * real DOM appears in its place with no flash.
 */
export interface PersistVisualLayer {
  outer: HTMLElement;
  inner: HTMLElement;
}

/**
 * The temporary layers created for a pair (one per existing side).
 * `fromLayer` faithfully represents the OLD state, `toLayer` the FINAL
 * state — the system never deforms one element into pretending to be the
 * other; it hands off between two truthful snapshots.
 */
export interface PersistPairLayers {
  fromLayer?: PersistVisualLayer;
  toLayer?: PersistVisualLayer;
}

export interface PersistContextBase {
  direction: PersistDirection;
  timings: DeltachedTimings;
  debug: boolean;
  /** No-op unless `debug`; prefixed `[DeltachedTransition:persist]`. */
  warn: (message: string) => void;
}

export interface PersistCaptureContext extends PersistContextBase {
  /** The root (source or target) being scanned. */
  root: HTMLElement;
  role: PersistRole;
  /** Match key of the element being captured — echo it into the snapshot. */
  id: string;
  /** Kind resolved by classification — echo it into the snapshot. */
  kind: PersistKind;
}

export interface PersistLayerContext extends PersistContextBase {
  /** The fixed overlay the layer will be appended to (by the session). */
  overlay: HTMLElement;
}

export interface PersistAnimationContext extends PersistContextBase {
  /** The transition's main timeline. Add tweens at position 0. */
  timeline: gsap.core.Timeline;
  /** Duration of the surface morph for this direction. */
  duration: number;
  /** Ease of the surface morph for this direction (may overshoot). */
  ease: string;
  /**
   * Non-overshooting ease for layer geometry — use this (not `ease`) for
   * every frame/scale tween. It is the surface ease clamped at 1 (or the
   * user's `geometryEase`), so layers track the surface in sync and never
   * outgrow their destination.
   */
  geometryEase: string | gsap.EaseFunction;
  /** Resolved handoff tuning (defaults applied, fractions clamped). */
  handoff: Required<PersistHandoffConfig>;
}

export type PersistCleanupContext = PersistContextBase;

export interface PersistAdapter {
  kind: PersistKind;
  /**
   * MUST be read-only (rect / computed-style reads, `toDataURL`). It runs
   * inside the grouped read phase — any DOM write here causes layout
   * thrashing for every snapshot that follows.
   */
  capture(el: HTMLElement, ctx: PersistCaptureContext): PersistSnapshot;
  /**
   * Returns a detached outer/inner layer. The session appends `outer` to
   * the overlay and seats its initial frame (x/y/width/height/alpha); the
   * adapter only builds content and static styles.
   */
  createLayer(
    snapshot: PersistSnapshot,
    role: PersistRole,
    ctx: PersistLayerContext,
  ): PersistVisualLayer;
  /**
   * Either add tweens to `ctx.timeline` at position 0, or return a
   * timeline, which the session nests at 0 — either way everything lives
   * on the main timeline, so interruption kills it all atomically.
   */
  animate(
    pair: PersistPair,
    layers: PersistPairLayers,
    ctx: PersistAnimationContext,
  ): gsap.core.Timeline | void;
  /** Runs once per transition teardown, after layers are removed. */
  cleanup?(ctx: PersistCleanupContext): void;
}

/** Fully-defaulted config; `null` upstream means the feature is off. */
export interface ResolvedPersistConfig {
  attribute: string;
  selector: string;
  debug: boolean;
  adapters: Record<PersistKind, PersistAdapter>;
  /** Whether the user supplied `adapters.custom` (drives a fallback warn). */
  customProvided: boolean;
  classify: (el: HTMLElement) => PersistKind;
  overflow: "clip-to-surface" | "allow";
  handoff: Required<PersistHandoffConfig>;
  /** User override; `null` → the surface ease clamped at 1 (resolved per flight). */
  geometryEase: string | null;
  zIndex: number;
}
