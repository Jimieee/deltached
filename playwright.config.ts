import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
const baseURL = `http://localhost:${PORT}`;

/**
 * E2E config. The fixtures are served by Vite (see e2e/vite.config.ts), which
 * aliases `deltached` straight to the library source — so the tests run against
 * the real code with no build step.
 */
export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm exec vite --config e2e/vite.config.ts --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
