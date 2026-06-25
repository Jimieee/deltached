import { gsap } from "gsap";

/**
 * Theme toggle. The initial theme is resolved before paint by the inline boot
 * script in Base.astro; this only wires the button. On click it persists the
 * choice and flips `html.dark` inside a View Transition, which the scoped CSS in
 * global.css turns into a circular reveal growing from the button plus a sliding
 * icon swap. Reduced-motion and browsers without View Transitions fall back to
 * an instant flip (with a GSAP overshoot on the icon so the control still
 * answers).
 */

const STORAGE_KEY = "theme";
type Cleanup = () => void;

const prefersDark = (): boolean =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;
const reduceMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isDark = (): boolean => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? stored === "dark" : prefersDark();
};

const applyTheme = (dark: boolean): void => {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
};

/**
 * Aim the circular reveal at the button and size its radius to reach the
 * farthest viewport corner, so the clip-path circle always covers the page.
 */
const setOrigin = (button: HTMLElement): void => {
  const rect = button.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  const root = document.documentElement;
  root.style.setProperty("--theme-x", `${x}px`);
  root.style.setProperty("--theme-y", `${y}px`);
  root.style.setProperty("--theme-r", `${radius}px`);
};

export function initTheme(): Cleanup {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]"),
  );
  if (buttons.length === 0) return () => {};

  const toggle = (button: HTMLElement): void => {
    const next = !isDark();
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");

    if (reduceMotion() || !document.startViewTransition) {
      applyTheme(next);
      const icon = button.querySelector<HTMLElement>(".theme-toggle__icons");
      if (icon && !reduceMotion()) {
        gsap.fromTo(
          icon,
          { yPercent: 130, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.5, ease: "back.out(1.7)" },
        );
      }
      return;
    }

    setOrigin(button);
    const root = document.documentElement;
    root.dataset.themeTransition = "";
    const transition = document.startViewTransition(() => applyTheme(next));
    transition.finished.finally(() => {
      delete root.dataset.themeTransition;
    });
  };

  const disposers = buttons.map((button) => {
    const onClick = () => toggle(button);
    button.addEventListener("click", onClick);
    return () => button.removeEventListener("click", onClick);
  });

  return () => disposers.forEach((dispose) => dispose());
}
