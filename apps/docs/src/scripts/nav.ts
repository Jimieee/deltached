import { gsap } from "gsap";

/**
 * Gooey nav (see NavMorph.astro + GooFilter.astro). Rendered fresh per page,
 * so there is no cross-page state to corrupt. Robustness comes from one rule:
 * `settle()` is the single, always-reachable clean resting state (no goo, blobs
 * at their pills, correct layer shown). Every timeline lands on it (onComplete)
 * and teardown calls it — so the goo / blur can never get stuck.
 *
 *  - Entrance: the active chip splits out from INSIDE the navbar (the panel
 *    starts covering it and recedes) with a goo neck; the goo is on ONLY here.
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
  const refsLayer = root.querySelector<HTMLElement>('[data-panel-layer="refs"]');
  const pagesLayer = root.querySelector<HTMLElement>('[data-panel-layer="pages"]');
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
  const visible = () => root.offsetParent !== null && width(chip) > 0;

  const measure = () => {
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
    gsap.set(expanded ? pagesLayer : refsLayer, { autoAlpha: 1, "--layer-blur": "0px" });
    gsap.set(expanded ? refsLayer : pagesLayer, { autoAlpha: 0, "--layer-blur": "8px" });
    syncBlobs();
  };

  /** The chip splits out from inside the navbar; the goo is on only here. */
  const entrance = () => {
    measure();
    expanded = false;
    root.dataset.navExpanded = "false";
    gsap.set(pagesLayer, { autoAlpha: 0, "--layer-blur": "8px" });
    gsap.set(refsLayer, { autoAlpha: 0, "--layer-blur": "12px" });
    gsap.set(chip, { x: 0, "--chip-blur": "6px", autoAlpha: 0.5 });
    // panel starts fully covering the chip (x = -offsetLeft), then recedes.
    gsap.set(panel, { x: -panel.offsetLeft, width: refsW });
    syncBlobs();
    setMorphing(true);
    tl?.kill();
    tl = gsap
      .timeline({
        defaults: { ease: "power3.out" },
        onUpdate: syncBlobs,
        onComplete: settle,
      })
      .to(panel, { x: 0, duration: 0.7 }, 0)
      .to(chip, { "--chip-blur": "0px", autoAlpha: 1, duration: 0.4 }, 0.2)
      .to(refsLayer, { autoAlpha: 1, "--layer-blur": "0px", duration: 0.45 }, 0.28);
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
      .to(incoming, { autoAlpha: 1, "--layer-blur": "0px", duration: 0.32 }, 0.14);
  };

  const ensure = () => {
    if (!visible()) return;
    measure();
    if (!entered) {
      entered = true;
      entrance();
    } else if (!tl || !tl.isActive()) {
      settle();
    }
  };
  ensure(); // paint the entrance start state immediately (no flash)
  requestAnimationFrame(ensure);

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
    window.removeEventListener("resize", onResize);
    triggers.forEach((dispose) => dispose());
    setMorphing(false);
  };
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

export function initNav(): Cleanup {
  const teardowns = Array.from(
    document.querySelectorAll<HTMLElement>("[data-navmorph]"),
  ).map(wireMorph);

  Array.from(document.querySelectorAll<HTMLElement>("[data-refs]")).forEach(
    (refs) => teardowns.push(wireReferences(refs)),
  );

  return () => teardowns.forEach((dispose) => dispose());
}
