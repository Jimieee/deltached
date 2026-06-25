import { expect, test, type Page } from "@playwright/test";

/** Collect any uncaught page errors so every test can assert none occurred. */
function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

const panel = "#panel";
const morphing = `${panel}[data-deltached-morphing]`;

/**
 * One behaviour suite, run against every fixture (vanilla + each framework
 * wrapper). The wrappers expose the same `window.__deltached` handle, so a pass
 * here is proof the bindings drive the core identically — not just that they
 * render.
 */
export function defineMorphSuite(name: string, path: string): void {
  test.describe(name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
      await page.waitForFunction(() => Boolean(window.__deltached));
    });

    test("enter() opens and settles the panel", async ({ page }) => {
      const errors = trackPageErrors(page);

      const completed = await page.evaluate(() =>
        window.__deltached.transition.enter(),
      );

      expect(completed).toBe(true);
      await expect(page.locator(panel)).toBeVisible();
      const phase = await page.evaluate(
        () => window.__deltached.transition.phase,
      );
      expect(phase).toBe("open");
      await expect(page.locator(morphing)).toHaveCount(0);
      expect(errors).toEqual([]);
    });

    test("leave() closes the panel and resets to idle", async ({ page }) => {
      const errors = trackPageErrors(page);

      await page.evaluate(() => window.__deltached.transition.enter());
      const completed = await page.evaluate(() =>
        window.__deltached.transition.leave(),
      );

      expect(completed).toBe(true);
      await expect(page.locator(panel)).toBeHidden();
      const phase = await page.evaluate(
        () => window.__deltached.transition.phase,
      );
      expect(phase).toBe("idle");
      expect(errors).toEqual([]);
    });

    test("reverting mid-enter never tears the DOM", async ({ page }) => {
      const errors = trackPageErrors(page);

      const result = await page.evaluate(async () => {
        const { transition } = window.__deltached;
        const enterPromise = transition.enter();
        const leavePromise = transition.leave();
        const [entered, left] = await Promise.all([enterPromise, leavePromise]);
        return { entered, left, phase: transition.phase };
      });

      expect(result.entered).toBe(false);
      expect(["idle", "open"]).toContain(result.phase);
      await expect(page.locator(morphing)).toHaveCount(0);
      expect(errors).toEqual([]);
    });

    test("rapid enter/leave bursts settle without tearing the DOM", async ({
      page,
    }) => {
      const errors = trackPageErrors(page);

      await page.evaluate(() => {
        const { transition } = window.__deltached;
        for (let i = 0; i < 5; i++) {
          void transition.enter();
          void transition.leave();
        }
      });

      await page.waitForFunction(
        () => !window.__deltached.transition.isAnimating,
      );

      const phase = await page.evaluate(
        () => window.__deltached.transition.phase,
      );
      expect(["idle", "open"]).toContain(phase);
      await expect(page.locator(morphing)).toHaveCount(0);
      expect(errors).toEqual([]);
    });

    test("opens under prefers-reduced-motion and reports the preference", async ({
      page,
    }) => {
      const errors = trackPageErrors(page);

      await page.emulateMedia({ reducedMotion: "reduce" });

      const reduced = await page.evaluate(() =>
        window.__deltached.prefersReducedMotion(),
      );
      expect(reduced).toBe(true);

      const completed = await page.evaluate(() =>
        window.__deltached.transition.enter(),
      );
      expect(completed).toBe(true);
      await expect(page.locator(panel)).toBeVisible();
      expect(errors).toEqual([]);
    });

    test("destroy() tears everything down cleanly", async ({ page }) => {
      const errors = trackPageErrors(page);

      await page.evaluate(() => window.__deltached.transition.enter());
      await page.evaluate(() => window.__deltached.transition.destroy());

      await expect(page.locator("[data-deltached-morphing]")).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  });
}
