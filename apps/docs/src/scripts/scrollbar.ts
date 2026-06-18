import { gsap } from "gsap";
import { getLenis } from "./smooth-scroll";

/**
 * Custom overlay scrollbar. The native bar is hidden (see global.css), so this
 * thumb is the only scroll indicator — a fixed strip that mirrors scroll
 * progress, fades in while scrolling, fades out when idle, and can be dragged.
 *
 * It reads scroll from Lenis when present (so the thumb tracks the smoothed
 * position) and falls back to native `window` scroll otherwise. Because the
 * thumb is `position: fixed` and the native bar takes no width, nothing here
 * ever reserves layout space — the appear/disappear shift is gone.
 */

const MIN_THUMB = 40;
const IDLE_HIDE_MS = 900;

export function initScrollbar(): () => void {
  if (typeof document === "undefined") return () => {};

  const bar = document.querySelector<HTMLElement>("[data-scrollbar]");
  const thumb = bar?.querySelector<HTMLElement>("[data-scrollbar-thumb]");
  if (!bar || !thumb) return () => {};

  const lenis = getLenis();
  const setY = gsap.quickSetter(thumb, "y", "px");
  const clamp = gsap.utils.clamp(0, 1);

  let trackH = 0;
  let maxTravel = 0;
  let scrollable = 0;

  let idleTimer: number | undefined;
  let visible = false;
  let dragging = false;

  const currentScroll = (): number =>
    lenis ? lenis.scroll : window.scrollY || document.documentElement.scrollTop;

  const show = () => {
    if (visible) return;
    visible = true;
    gsap.to(bar, { autoAlpha: 1, duration: 0.2, ease: "power2.out" });
  };

  const scheduleHide = () => {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (dragging) return;
      visible = false;
      gsap.to(bar, { autoAlpha: 0, duration: 0.4, ease: "power2.out" });
    }, IDLE_HIDE_MS);
  };

  const measure = () => {
    const viewport = window.innerHeight;
    const content = document.documentElement.scrollHeight;
    trackH = bar.clientHeight;
    scrollable = Math.max(content - viewport, 0);

    const ratio = content > 0 ? viewport / content : 1;
    const thumbH = Math.min(Math.max(ratio * trackH, MIN_THUMB), trackH);
    maxTravel = trackH - thumbH;

    thumb.style.height = `${thumbH}px`;
    // Nothing to scroll → no bar at all.
    bar.style.display = scrollable <= 0 ? "none" : "";
  };

  const render = () => {
    if (scrollable <= 0) return;
    setY(clamp(currentScroll() / scrollable) * maxTravel);
  };

  const onScroll = () => {
    render();
    show();
    scheduleHide();
  };

  const onResize = () => {
    measure();
    render();
  };

  // ---- drag ------------------------------------------------------------
  let dragStartY = 0;
  let dragStartScroll = 0;

  const scrollTo = (value: number) => {
    if (lenis) lenis.scrollTo(value, { immediate: true });
    else window.scrollTo(0, value);
  };

  const onPointerDown = (event: PointerEvent) => {
    event.preventDefault();
    dragging = true;
    dragStartY = event.clientY;
    dragStartScroll = currentScroll();
    thumb.setPointerCapture(event.pointerId);
    show();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging || maxTravel <= 0) return;
    const dy = event.clientY - dragStartY;
    const target = dragStartScroll + (dy / maxTravel) * scrollable;
    scrollTo(gsap.utils.clamp(0, scrollable, target));
    render();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    try {
      thumb.releasePointerCapture(event.pointerId);
    } catch {
      /* pointer already released */
    }
    scheduleHide();
  };

  measure();
  render();

  if (lenis) lenis.on("scroll", onScroll);
  else window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  thumb.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  // Late-loading images/fonts can change content height; re-measure on growth.
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(document.body);

  return () => {
    window.clearTimeout(idleTimer);
    if (lenis) lenis.off("scroll", onScroll);
    else window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    thumb.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    resizeObserver.disconnect();
    gsap.set(bar, { clearProps: "opacity,visibility" });
  };
}
