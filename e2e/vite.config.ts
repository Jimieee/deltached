import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const fromHere = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

/**
 * Serves the e2e fixtures. Bare imports resolve to library SOURCE — the same
 * code that ships — so every framework fixture exercises the real wrapper over
 * the real core, with no build step between the test and what we publish.
 */
export default defineConfig({
  root: fromHere("."),
  plugins: [react(), vue(), svelte()],
  resolve: {
    alias: {
      deltached: fromHere("../packages/deltached/src/index.ts"),
      "@deltached/react": fromHere("../packages/react/src/index.ts"),
      "@deltached/vue": fromHere("../packages/vue/src/index.ts"),
      "@deltached/svelte": fromHere(
        "../packages/svelte/src/lib/index.svelte.ts",
      ),
    },
  },
});
