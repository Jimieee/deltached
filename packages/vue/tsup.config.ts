import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  // `deltached` (dependency) and `vue` (peer) are externalized by tsup
  // automatically, so the binding ships as a thin layer with no bundled copies.
});
