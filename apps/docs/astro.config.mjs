import { defineConfig } from "astro/config";

const githubPages = process.env.DEPLOY_GITHUB_PAGES === "true";

export default defineConfig({
  site: githubPages ? "https://jimieee.github.io" : undefined,
  base: githubPages ? "/deltached" : undefined,
});
