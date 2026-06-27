import { defineConfig } from "astro/config";

const githubPages = process.env.DEPLOY_GITHUB_PAGES === "true";

export default defineConfig({
  // `site` is always set so canonical/Open Graph URLs resolve to absolute
  // production URLs even in local builds. `base` only applies on GitHub Pages.
  site: "https://jimieee.github.io",
  base: githubPages ? "/deltached" : undefined,
});
