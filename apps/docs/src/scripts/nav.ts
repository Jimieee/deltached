import { gsap } from "gsap";

/**
 * Gooey nav (see NavMorph.astro + GooFilter.astro). Each hard load starts in
 * the server-rendered resting state; route changes are animated separately by
 * the cross-page overlay below. `settle()` remains the single clean resting
 * state (no goo, blobs at their pills, correct layer shown).
 *
 *  - Toggle (hover/tap): references ⇆ pages — width adapts + content crossfade,
 *    no goo (both states are already separate pills).
 */

type Cleanup = () => void;

const width = (el: HTMLElement): number => el.getBoundingClientRect().width;

function wireMorph(root: HTMLElement): Cleanup {
  const chip = root.querySelector<HTMLElement>("[data-nav-chip]");
  const panel = root.querySelector<HTMLElement>("[data-nav-panel]");
  const chipBlob = root.querySelector<HTMLElement>('[data-blob="chip"]');
  const panelBlob = root.querySelector<HTMLElement>('[data-blob="panel"]');
  const refsLayer = root.querySelector<HTMLElement>(
    '[data-panel-layer="refs"]',
  );
  const pagesLayer = root.querySelector<HTMLElement>(
    '[data-panel-layer="pages"]',
  );
  if (!chip || !panel || !chipBlob || !panelBlob || !refsLayer || !pagesLayer) {
    return () => {};
  }

  const touch = root.dataset.trigger === "touch";
  let expanded = false;
  let entered = false;
  let refsW = 0;
  let pagesW = 0;
  let tl: gsap.core.Timeline | null = null;

  const setMorphing = (on: boolean) => root.classList.toggle("is-morphing", on);
  const restW = () => (expanded ? pagesW : refsW);
  const visible = () =>
    root.offsetParent !== null &&
    width(chip) > 0 &&
    !root.closest("[data-route-nav-hidden]");

  const measure = () => {
    // Sync the overflow chevrons first: on resize they share the references
    // width with this measurement, so reading before they settle would freeze a
    // stale panel width (empty gap, or chevrons stuck on/off).
    primeReferencesOverflow(root);
    refsW = width(refsLayer);
    pagesW = width(pagesLayer);
  };

  const syncBlobs = () => {
    const base = root.getBoundingClientRect();
    const place = (blob: HTMLElement, el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      gsap.set(blob, { x: r.left - base.left, width: r.width });
    };
    place(chipBlob, chip);
    place(panelBlob, panel);
  };

  /** The single clean resting state — always reachable, nothing can stick. */
  const settle = () => {
    setMorphing(false);
    gsap.set(chip, { x: 0, "--chip-blur": "0px", autoAlpha: 1 });
    gsap.set(panel, { x: 0, width: restW() });
    gsap.set(expanded ? pagesLayer : refsLayer, {
      autoAlpha: 1,
      "--layer-blur": "0px",
    });
    gsap.set(expanded ? refsLayer : pagesLayer, {
      autoAlpha: 0,
      "--layer-blur": "8px",
    });
    root.dataset.navReady = "true";
    syncBlobs();
  };

  /** References ⇆ pages: width adapts + crossfade, no goo. */
  const toggle = (next: boolean) => {
    if (next === expanded) return;
    expanded = next;
    root.dataset.navExpanded = String(next);
    setMorphing(false); // toggle never gooes (both states are separate pills)

    const incoming = next ? pagesLayer : refsLayer;
    const outgoing = next ? refsLayer : pagesLayer;
    tl?.kill();
    tl = gsap
      .timeline({
        defaults: { ease: "power3.inOut" },
        onUpdate: syncBlobs,
        onComplete: settle,
      })
      .to(panel, { width: restW(), x: 0, duration: 0.45 }, 0)
      .to(outgoing, { autoAlpha: 0, "--layer-blur": "8px", duration: 0.18 }, 0)
      .to(
        incoming,
        { autoAlpha: 1, "--layer-blur": "0px", duration: 0.32 },
        0.14,
      );
  };

  const ensure = () => {
    if (!visible()) return;
    measure();
    if (!entered) {
      entered = true;
      settle();
    } else if (!tl || !tl.isActive()) {
      settle();
    }
  };
  ensure();
  requestAnimationFrame(ensure);
  const onRouteReveal = () => ensure();
  document.addEventListener("route-nav:revealed", onRouteReveal);

  // ---- triggers --------------------------------------------------------
  const triggers: Cleanup[] = [];
  if (touch) {
    const onChip = (event: Event) => {
      event.preventDefault();
      toggle(!expanded);
    };
    const onOutside = (event: Event) => {
      if (!root.contains(event.target as Node)) toggle(false);
    };
    chip.addEventListener("click", onChip);
    document.addEventListener("pointerdown", onOutside);
    triggers.push(() => {
      chip.removeEventListener("click", onChip);
      document.removeEventListener("pointerdown", onOutside);
    });
  } else {
    let timer: number | undefined;
    const onChipEnter = () => {
      window.clearTimeout(timer);
      toggle(true);
    };
    const onEnter = () => window.clearTimeout(timer);
    const onLeave = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => toggle(false), 120);
    };
    chip.addEventListener("pointerenter", onChipEnter);
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);
    triggers.push(() => {
      window.clearTimeout(timer);
      chip.removeEventListener("pointerenter", onChipEnter);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
    });
  }

  const onResize = () => ensure();
  window.addEventListener("resize", onResize);

  return () => {
    tl?.kill();
    document.removeEventListener("route-nav:revealed", onRouteReveal);
    window.removeEventListener("resize", onResize);
    triggers.forEach((dispose) => dispose());
    setMorphing(false);
  };
}

/**
 * Decide, for every references group under `root`, whether its track overflows
 * its cap — the same test `wireReferences` runs, but applied eagerly. The
 * prev/next chevrons are revealed by `data-overflow`, and they add width to the
 * pill. The morph measures the references to size its panel, so the overflow
 * state must be settled *before* that measurement; otherwise the panel is sized
 * ~2 chevrons too narrow and clips the references during a route morph.
 */
function primeReferencesOverflow(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>("[data-refs]").forEach((refs) => {
    const track = refs.querySelector<HTMLElement>("[data-refs-track]");
    if (track) {
      refs.dataset.overflow = String(track.scrollWidth - track.clientWidth > 1);
    }
  });
}

/** Reveal the references chevrons only on overflow; page the track on click. */
function wireReferences(refs: HTMLElement): Cleanup {
  const track = refs.querySelector<HTMLElement>("[data-refs-track]");
  if (!track) return () => {};

  const update = () => {
    refs.dataset.overflow = String(track.scrollWidth - track.clientWidth > 1);
  };

  const prev = refs.querySelector<HTMLElement>("[data-refs-prev]");
  const next = refs.querySelector<HTMLElement>("[data-refs-next]");
  const step = () => Math.max(track.clientWidth * 0.7, 80);
  const onPrev = () => track.scrollBy({ left: -step(), behavior: "smooth" });
  const onNext = () => track.scrollBy({ left: step(), behavior: "smooth" });
  prev?.addEventListener("click", onPrev);
  next?.addEventListener("click", onNext);

  update();
  const observer = new ResizeObserver(update);
  observer.observe(track);
  window.addEventListener("resize", update);

  return () => {
    observer.disconnect();
    window.removeEventListener("resize", update);
    prev?.removeEventListener("click", onPrev);
    next?.removeEventListener("click", onNext);
  };
}

type RouteNavKind = "desktop" | "mobile";
type RouteNavMode = "plain" | "morph";

interface RouteRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface RouteNavSnapshot {
  kind: RouteNavKind;
  mode: RouteNavMode;
  bodyRect: RouteRect;
  panelRect: RouteRect;
  panelHTML: string;
  chipRect: RouteRect | null;
  chipLabel: string;
  vars: Record<string, string>;
}

interface PendingRouteNavTransition {
  kind: RouteNavKind;
  old: RouteNavSnapshot;
  removeAbortListener: Cleanup | null;
}

type AstroPreparationEvent = Event & {
  loader?: () => Promise<void>;
  newDocument?: Document;
  signal?: AbortSignal;
};

type AstroSwapEvent = Event & {
  newDocument?: Document;
};

const ROUTE_NAV_ATTR = "data-route-nav";
const ROUTE_NAV_HIDDEN_ATTR = "data-route-nav-hidden";
const ROUTE_NAV_TRANSITION_ATTR = "data-route-nav-transition";
const ROUTE_NAV_REVEALED_EVENT = "route-nav:revealed";
const ROUTE_NAV_BOOTSTRAPPED = "__deltachedRouteNavTransitions";
const MOBILE_QUERY = "(max-width: 768px)";
const NAV_ROUTE_VARS = [
  "--morph-height",
  "--morph-gap",
  "--refs-height",
  "--refs-arrow",
  "--refs-track-max",
  "--refs-font",
  "--refs-fade",
  "--refs-pad",
  "--refs-link-pad",
  "--refs-gap",
  "--radius-pill",
  "--ink",
  "--ink-fg",
  "--hover-tint",
];

let pendingRouteTransition: PendingRouteNavTransition | null = null;
let routeTransitionTl: gsap.core.Timeline | null = null;
let routeOverlay: HTMLElement | null = null;
let routeFlowBody: HTMLElement | null = null;
let routeHandoffFrame: number | null = null;

const routeKindForViewport = (): RouteNavKind =>
  window.matchMedia(MOBILE_QUERY).matches ? "mobile" : "desktop";

const reduceMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const rectFrom = (rect: DOMRect, widthOverride?: number): RouteRect => ({
  left: rect.left,
  top: rect.top,
  width: widthOverride ?? rect.width,
  height: rect.height,
});

const rectVars = (rect: RouteRect): gsap.TweenVars => ({
  x: rect.left,
  y: rect.top,
  width: Math.max(rect.width, 0),
  height: rect.height,
});

function routeNavSelector(kind: RouteNavKind): string {
  return `[${ROUTE_NAV_ATTR}="${kind}"]`;
}

function routeNavMode(root: ParentNode): RouteNavMode | null {
  if (root.querySelector("[data-navmorph]")) return "morph";
  if (root.querySelector("[data-nav-plain]")) return "plain";
  return null;
}

function visibleBox(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function navBody(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>("[data-navmorph], [data-nav-plain]");
}

function currentRouteNav(kind = routeKindForViewport()): HTMLElement | null {
  const preferred = document.querySelector<HTMLElement>(routeNavSelector(kind));
  const preferredBody = preferred ? navBody(preferred) : null;
  if (preferred && preferredBody && visibleBox(preferredBody)) return preferred;

  return (
    Array.from(
      document.querySelectorAll<HTMLElement>(`[${ROUTE_NAV_ATTR}]`),
    ).find((root) => {
      const body = navBody(root);
      return body ? visibleBox(body) : false;
    }) ?? null
  );
}

function readRouteVars(source: HTMLElement): Record<string, string> {
  const style = window.getComputedStyle(source);
  return Object.fromEntries(
    NAV_ROUTE_VARS.map((name) => [name, style.getPropertyValue(name)]),
  );
}

function applyRouteVars(
  target: HTMLElement,
  vars: Record<string, string>,
): void {
  Object.entries(vars).forEach(([name, value]) => {
    if (value.trim()) target.style.setProperty(name, value);
  });
}

function mergeRouteVars(
  oldVars: Record<string, string>,
  newVars: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    NAV_ROUTE_VARS.map((name) => [
      name,
      newVars[name]?.trim() ? newVars[name] : oldVars[name],
    ]),
  );
}

function activeMorphLayer(morph: HTMLElement): HTMLElement | null {
  const expanded = morph.dataset.navExpanded === "true";
  return morph.querySelector<HTMLElement>(
    `[data-panel-layer="${expanded ? "pages" : "refs"}"]`,
  );
}

function stripAstroScopedAttrs(root: HTMLElement): void {
  [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))].forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("data-astro-cid")) el.removeAttribute(attr.name);
    });
  });
}

function panelHTML(el: HTMLElement, stripScoped = false): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.removeAttribute(ROUTE_NAV_HIDDEN_ATTR);
  clone
    .querySelectorAll<HTMLElement>(`[${ROUTE_NAV_HIDDEN_ATTR}]`)
    .forEach((child) => child.removeAttribute(ROUTE_NAV_HIDDEN_ATTR));
  if (stripScoped) stripAstroScopedAttrs(clone);
  return clone.outerHTML;
}

function collapsedChipRect(
  panel: RouteRect,
  chip: RouteRect | null,
): RouteRect {
  return {
    left: panel.left + panel.height * 0.45,
    top: panel.top,
    width: 0,
    height: chip?.height ?? panel.height,
  };
}

function chipPillRect(chip: HTMLElement, panelRect: RouteRect): RouteRect {
  const chipBox = chip.getBoundingClientRect();
  return {
    left: chipBox.left,
    top: panelRect.top,
    width: chipBox.width,
    height: panelRect.height,
  };
}

function syncMorphBlobs(morph: HTMLElement): void {
  const chip = morph.querySelector<HTMLElement>("[data-nav-chip]");
  const panel = morph.querySelector<HTMLElement>("[data-nav-panel]");
  const chipBlob = morph.querySelector<HTMLElement>('[data-blob="chip"]');
  const panelBlob = morph.querySelector<HTMLElement>('[data-blob="panel"]');
  if (!chip || !panel || !chipBlob || !panelBlob) return;

  const base = morph.getBoundingClientRect();
  const place = (blob: HTMLElement, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    gsap.set(blob, { x: rect.left - base.left, width: rect.width });
  };
  place(chipBlob, chip);
  place(panelBlob, panel);
}

function primeMorphForRoute(root: HTMLElement): void {
  const morph = root.querySelector<HTMLElement>("[data-navmorph]");
  if (!morph) return;

  const chip = morph.querySelector<HTMLElement>("[data-nav-chip]");
  const panel = morph.querySelector<HTMLElement>("[data-nav-panel]");
  const refsLayer = morph.querySelector<HTMLElement>(
    '[data-panel-layer="refs"]',
  );
  const pagesLayer = morph.querySelector<HTMLElement>(
    '[data-panel-layer="pages"]',
  );
  if (!chip || !panel || !refsLayer || !pagesLayer) return;

  // Settle the chevrons before measuring so the panel includes their width.
  primeReferencesOverflow(morph);

  const refsW = width(refsLayer);
  morph.dataset.navExpanded = "false";
  morph.classList.remove("is-morphing");
  gsap.set(chip, { x: 0, "--chip-blur": "0px", autoAlpha: 1 });
  gsap.set(panel, { x: 0, width: refsW });
  gsap.set(refsLayer, { autoAlpha: 1, "--layer-blur": "0px" });
  gsap.set(pagesLayer, { autoAlpha: 0, "--layer-blur": "8px" });
  morph.dataset.navReady = "true";
  syncMorphBlobs(morph);
}

function snapshotRouteNav(
  root: HTMLElement,
  kind: RouteNavKind,
): RouteNavSnapshot | null {
  const body = navBody(root);
  if (!body) return null;

  const morph = root.querySelector<HTMLElement>("[data-navmorph]");
  if (morph) {
    const chip = morph.querySelector<HTMLElement>("[data-nav-chip]");
    const panel = morph.querySelector<HTMLElement>("[data-nav-panel]");
    const layer = activeMorphLayer(morph);
    if (!chip || !panel || !layer) return null;

    const layerW = width(layer);
    const panelBox = panel.getBoundingClientRect();
    const panelRect = rectFrom(
      panelBox,
      panelBox.width > 1 ? panelBox.width : layerW,
    );

    return {
      kind,
      mode: "morph",
      bodyRect: rectFrom(body.getBoundingClientRect()),
      panelRect,
      panelHTML: panelHTML(layer),
      chipRect: chipPillRect(chip, panelRect),
      chipLabel: chip.textContent?.trim() ?? "",
      vars: readRouteVars(morph),
    };
  }

  const links = root.querySelector<HTMLElement>("[data-nav-plain]");
  if (!links) return null;

  return {
    kind,
    mode: "plain",
    bodyRect: rectFrom(body.getBoundingClientRect()),
    panelRect: rectFrom(links.getBoundingClientRect()),
    panelHTML: panelHTML(links, true),
    chipRect: null,
    chipLabel: "",
    vars: readRouteVars(links),
  };
}

function clearRouteOverlay(): void {
  if (routeHandoffFrame !== null) {
    window.cancelAnimationFrame(routeHandoffFrame);
    routeHandoffFrame = null;
  }
  routeTransitionTl?.kill();
  routeTransitionTl = null;
  if (routeFlowBody) {
    gsap.set(routeFlowBody, {
      clearProps: "width,minWidth,maxWidth,overflow,opacity,visibility,filter",
    });
  }
  routeFlowBody = null;
  routeOverlay?.remove();
  routeOverlay = null;
}

function clearRouteNavState(): void {
  document.documentElement.removeAttribute(ROUTE_NAV_TRANSITION_ATTR);
  document
    .querySelectorAll<HTMLElement>(`[${ROUTE_NAV_HIDDEN_ATTR}]`)
    .forEach((root) => root.removeAttribute(ROUTE_NAV_HIDDEN_ATTR));
}

function setRouteNavBodyHidden(
  root: HTMLElement | null,
  hidden: boolean,
): void {
  const body = root ? navBody(root) : null;
  body?.toggleAttribute(ROUTE_NAV_HIDDEN_ATTR, hidden);
}

function cancelPendingRouteTransition(): void {
  clearRouteOverlay();
  clearRouteNavState();
  pendingRouteTransition?.removeAbortListener?.();
  pendingRouteTransition = null;
}

function revealRouteNav(root: HTMLElement | null): void {
  setRouteNavBodyHidden(root, false);
  document.documentElement.removeAttribute(ROUTE_NAV_TRANSITION_ATTR);
  document.dispatchEvent(new Event(ROUTE_NAV_REVEALED_EVENT));
}

function createRouteOverlay(
  oldState: RouteNavSnapshot,
  newState: RouteNavSnapshot,
) {
  const overlay = document.createElement("div");
  overlay.className = "route-nav-morph";
  overlay.setAttribute("aria-hidden", "true");
  overlay.dataset.routeKind = newState.kind;
  overlay.innerHTML = `
    <div class="route-nav-morph__goo">
      <span class="route-nav-morph__blob" data-route-blob="chip"></span>
      <span class="route-nav-morph__blob" data-route-blob="panel"></span>
    </div>
    <div class="route-nav-morph__content">
      <div class="route-nav-morph__chip" data-route-chip>
        <span data-route-chip-layer="old"></span>
        <span data-route-chip-layer="new"></span>
      </div>
      <div class="route-nav-morph__panel" data-route-panel>
        <div class="route-nav-morph__layer" data-route-panel-layer="old"></div>
        <div class="route-nav-morph__layer" data-route-panel-layer="new"></div>
      </div>
    </div>
  `;

  applyRouteVars(overlay, mergeRouteVars(oldState.vars, newState.vars));
  overlay.querySelector<HTMLElement>(
    '[data-route-chip-layer="old"]',
  )!.textContent = oldState.chipLabel;
  overlay.querySelector<HTMLElement>(
    '[data-route-chip-layer="new"]',
  )!.textContent = newState.chipLabel;
  overlay.querySelector<HTMLElement>(
    '[data-route-panel-layer="old"]',
  )!.innerHTML = oldState.panelHTML;
  overlay.querySelector<HTMLElement>(
    '[data-route-panel-layer="new"]',
  )!.innerHTML = newState.panelHTML;
  document.body.append(overlay);
  overlay.querySelector<HTMLElement>(
    '[data-route-panel-layer="old"]',
  )!.dataset.routePanelMode = oldState.mode;
  overlay.querySelector<HTMLElement>(
    '[data-route-panel-layer="new"]',
  )!.dataset.routePanelMode = newState.mode;

  return {
    overlay,
    chip: overlay.querySelector<HTMLElement>("[data-route-chip]")!,
    panel: overlay.querySelector<HTMLElement>("[data-route-panel]")!,
    chipBlob: overlay.querySelector<HTMLElement>('[data-route-blob="chip"]')!,
    panelBlob: overlay.querySelector<HTMLElement>('[data-route-blob="panel"]')!,
    oldChip: overlay.querySelector<HTMLElement>(
      '[data-route-chip-layer="old"]',
    )!,
    newChip: overlay.querySelector<HTMLElement>(
      '[data-route-chip-layer="new"]',
    )!,
    oldPanel: overlay.querySelector<HTMLElement>(
      '[data-route-panel-layer="old"]',
    )!,
    newPanel: overlay.querySelector<HTMLElement>(
      '[data-route-panel-layer="new"]',
    )!,
  };
}

function playRouteNavTransition(
  oldState: RouteNavSnapshot,
  newState: RouteNavSnapshot,
  newRoot: HTMLElement,
): void {
  clearRouteOverlay();
  primeMorphForRoute(newRoot);

  if (reduceMotion()) {
    revealRouteNav(newRoot);
    pendingRouteTransition = null;
    return;
  }

  const parts = createRouteOverlay(oldState, newState);
  routeOverlay = parts.overlay;
  const flowBody = navBody(newRoot);
  routeFlowBody = flowBody;

  const startChip =
    oldState.chipRect ??
    collapsedChipRect(oldState.panelRect, newState.chipRect);
  const endChip =
    newState.chipRect ??
    collapsedChipRect(newState.panelRect, oldState.chipRect);
  const hasOldChip = oldState.chipRect !== null;
  const hasNewChip = newState.chipRect !== null;

  if (flowBody) {
    gsap.set(flowBody, {
      width: oldState.bodyRect.width,
      minWidth: 0,
      maxWidth: "none",
      overflow: "hidden",
    });
  }

  gsap.set([parts.panel, parts.panelBlob], rectVars(oldState.panelRect));
  gsap.set([parts.chip, parts.chipBlob], rectVars(startChip));
  gsap.set(parts.oldPanel, { autoAlpha: 1, "--route-layer-blur": "0px" });
  gsap.set(parts.newPanel, {
    autoAlpha: 0,
    "--route-layer-blur": "12px",
  });
  gsap.set(parts.oldChip, {
    autoAlpha: hasOldChip ? 1 : 0,
    "--route-chip-blur": hasOldChip ? "0px" : "12px",
  });
  gsap.set(parts.newChip, {
    autoAlpha: hasOldChip ? 0 : 0,
    "--route-chip-blur": "12px",
  });
  gsap.set(parts.chip, { autoAlpha: hasOldChip || hasNewChip ? 1 : 0 });

  routeTransitionTl = gsap
    .timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        const completedOverlay = parts.overlay;
        routeTransitionTl = null;

        // Paint the settled navbar beneath the identical final overlay first.
        // Removing the compositor layer on the following frame avoids a blank
        // handoff frame on browsers using native View Transitions.
        revealRouteNav(newRoot);
        pendingRouteTransition?.removeAbortListener?.();
        pendingRouteTransition = null;
        routeHandoffFrame = window.requestAnimationFrame(() => {
          routeHandoffFrame = null;
          if (routeOverlay === completedOverlay) clearRouteOverlay();
        });
      },
    })
    .to(
      [parts.panel, parts.panelBlob],
      { ...rectVars(newState.panelRect), duration: 0.68 },
      0,
    )
    .to(
      [parts.chip, parts.chipBlob],
      { ...rectVars(endChip), duration: 0.68 },
      0,
    )
    .to(flowBody, { width: newState.bodyRect.width, duration: 0.68 }, 0)
    .to(
      parts.oldPanel,
      {
        autoAlpha: 0,
        "--route-layer-blur": "10px",
        duration: 0.22,
        ease: "power2.out",
      },
      0.04,
    )
    .to(
      parts.newPanel,
      {
        autoAlpha: 1,
        "--route-layer-blur": "0px",
        duration: 0.45,
        ease: "power2.out",
      },
      0.28,
    );

  if (hasOldChip) {
    routeTransitionTl.to(
      parts.oldChip,
      {
        autoAlpha: 0,
        "--route-chip-blur": "10px",
        duration: 0.24,
        ease: "power2.out",
      },
      hasNewChip ? 0.06 : 0.22,
    );
  }

  if (hasNewChip) {
    routeTransitionTl.to(
      parts.newChip,
      {
        autoAlpha: 1,
        "--route-chip-blur": "0px",
        duration: 0.36,
        ease: "power2.out",
      },
      hasOldChip ? 0.22 : 0.18,
    );
  } else {
    routeTransitionTl.to(parts.chip, { autoAlpha: 0, duration: 0.2 }, 0.42);
  }
}

function prepareRouteNavTransition(event: AstroPreparationEvent): void {
  if (!event.newDocument || event.signal?.aborted || event.defaultPrevented)
    return;
  if (reduceMotion()) return;

  const kind = routeKindForViewport();
  const oldRoot = currentRouteNav(kind);
  const newRoot = event.newDocument.querySelector<HTMLElement>(
    routeNavSelector(kind),
  );
  const nextMode = newRoot ? routeNavMode(newRoot) : null;
  if (!oldRoot || !nextMode) return;

  const oldMode = routeNavMode(oldRoot);
  if (oldMode !== "morph" && nextMode !== "morph") return;

  const oldState = snapshotRouteNav(oldRoot, kind);
  if (!oldState) return;

  cancelPendingRouteTransition();
  document.documentElement.setAttribute(ROUTE_NAV_TRANSITION_ATTR, "");

  // Keep the outgoing DOM visible until startViewTransition has captured it.
  // The incoming body is hidden later, inside before-swap and after capture.

  const abort = () => cancelPendingRouteTransition();
  event.signal?.addEventListener("abort", abort, { once: true });
  pendingRouteTransition = {
    kind,
    old: oldState,
    removeAbortListener: event.signal
      ? () => event.signal?.removeEventListener("abort", abort)
      : null,
  };
}

function onBeforePreparation(event: Event): void {
  const preparation = event as AstroPreparationEvent;
  if (typeof preparation.loader !== "function") return;

  const originalLoader = preparation.loader;
  preparation.loader = async () => {
    await originalLoader();
    prepareRouteNavTransition(preparation);
  };
}

function onBeforeSwap(event: Event): void {
  if (!pendingRouteTransition) return;
  const swap = event as AstroSwapEvent;
  swap.newDocument?.documentElement.setAttribute(ROUTE_NAV_TRANSITION_ATTR, "");
  const nextRoot = swap.newDocument?.querySelector<HTMLElement>(
    routeNavSelector(pendingRouteTransition.kind),
  );
  setRouteNavBodyHidden(nextRoot ?? null, true);
}

function onAfterSwap(): void {
  const pending = pendingRouteTransition;
  if (!pending) return;

  document.documentElement.setAttribute(ROUTE_NAV_TRANSITION_ATTR, "");
  const newRoot = document.querySelector<HTMLElement>(
    routeNavSelector(pending.kind),
  );
  if (!newRoot) {
    cancelPendingRouteTransition();
    return;
  }

  primeMorphForRoute(newRoot);
  const newState = snapshotRouteNav(newRoot, pending.kind);
  if (!newState) {
    cancelPendingRouteTransition();
    return;
  }

  playRouteNavTransition(pending.old, newState, newRoot);
}

export function initNavRouteTransitions(): Cleanup {
  const win = window as typeof window & { [ROUTE_NAV_BOOTSTRAPPED]?: boolean };
  if (win[ROUTE_NAV_BOOTSTRAPPED]) return () => {};
  win[ROUTE_NAV_BOOTSTRAPPED] = true;

  document.addEventListener("astro:before-preparation", onBeforePreparation);
  document.addEventListener("astro:before-swap", onBeforeSwap);
  document.addEventListener("astro:after-swap", onAfterSwap);

  return () => {
    document.removeEventListener(
      "astro:before-preparation",
      onBeforePreparation,
    );
    document.removeEventListener("astro:before-swap", onBeforeSwap);
    document.removeEventListener("astro:after-swap", onAfterSwap);
    cancelPendingRouteTransition();
    win[ROUTE_NAV_BOOTSTRAPPED] = false;
  };
}

export function initNav(): Cleanup {
  // Reveal overflow chevrons up front so the morph's first measurement already
  // accounts for their width (see primeReferencesOverflow).
  primeReferencesOverflow(document);

  const teardowns = Array.from(
    document.querySelectorAll<HTMLElement>("[data-navmorph]"),
  ).map(wireMorph);

  Array.from(document.querySelectorAll<HTMLElement>("[data-refs]")).forEach(
    (refs) => teardowns.push(wireReferences(refs)),
  );

  return () => teardowns.forEach((dispose) => dispose());
}
