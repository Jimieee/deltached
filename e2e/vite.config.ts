import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/**
 * Serves the e2e fixtures and resolves the bare `deltached` import to the
 * library source, so specs exercise the real code without a build.
 */
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: {
      deltached: fileURLToPath(
        new URL("../packages/deltached/src/index.ts", import.meta.url),
      ),
    },
  },
});
