/**
 * Drives the segmented-control code tabs (see `CodeGroup.astro`).
 *
 * Each `[data-code-group]` is a WAI-ARIA tablist: clicking or arrow-keying a
 * segment selects it, shows the matching panel, and slides the selection pill
 * under it. The pill geometry is measured from the live layout (so it tracks any
 * label width, font, or breakpoint) and re-measured on resize and once webfonts
 * settle. Returns a single teardown for SPA navigation, mirroring the other
 * page scripts.
 */

function setupGroup(group: HTMLElement): () => void {
  const seg = group.querySelector<HTMLElement>("[data-cg-seg]");
  const pill = group.querySelector<HTMLElement>("[data-cg-pill]");
  const tabs = Array.from(group.querySelectorAll<HTMLElement>("[data-cg-tab]"));
  const panels = Array.from(
    group.querySelectorAll<HTMLElement>("[data-cg-panel]"),
  );
  if (!seg || !pill || tabs.length === 0) return () => {};

  let active = Math.max(
    0,
    tabs.findIndex((t) => t.getAttribute("aria-selected") === "true"),
  );

  /** Move the pill under tab `i`. `animate=false` snaps it (initial layout). */
  function positionPill(i: number, animate = true): void {
    const tab = tabs[i];
    if (!tab) return;
    if (!animate) pill!.style.transition = "none";
    pill!.style.width = `${tab.offsetWidth}px`;
    pill!.style.transform = `translateX(${tab.offsetLeft}px)`;
    if (!animate) {
      // Force the snap to commit before transitions are restored next frame.
      void pill!.offsetWidth;
      pill!.style.transition = "";
    }
  }

  function select(i: number, focus = false): void {
    active = i;
    tabs.forEach((tab, index) => {
      const on = index === i;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
    panels.forEach((panel, index) => {
      panel.hidden = index !== i;
    });
    positionPill(i);
    if (focus) tabs[i]?.focus();
  }

  const onClick = (event: Event) => {
    const tab = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-cg-tab]",
    );
    if (!tab) return;
    select(tabs.indexOf(tab));
  };

  const onKeydown = (event: KeyboardEvent) => {
    let next = active;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (active + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (active - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = tabs.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    select(next, true);
  };

  // Coalesce resize bursts into one re-measure; widths are layout-derived.
  let raf = 0;
  const onResize = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      positionPill(active, false);
    });
  };

  seg.addEventListener("click", onClick);
  seg.addEventListener("keydown", onKeydown);
  window.addEventListener("resize", onResize, { passive: true });

  // Initial snap, then mark ready (drops the CSS-only fallback highlight).
  positionPill(active, false);
  group.dataset.cgReady = "true";
  // Webfonts can change label widths after first paint — re-snap when ready.
  document.fonts?.ready.then(() => positionPill(active, false));

  return () => {
    seg.removeEventListener("click", onClick);
    seg.removeEventListener("keydown", onKeydown);
    window.removeEventListener("resize", onResize);
    if (raf) cancelAnimationFrame(raf);
    delete group.dataset.cgReady;
  };
}

/** Wires every code group on the page; returns a single teardown for all. */
export function initCodeTabs(): () => void {
  const teardowns = Array.from(
    document.querySelectorAll<HTMLElement>("[data-code-group]"),
  ).map(setupGroup);

  return () => teardowns.forEach((dispose) => dispose());
}
