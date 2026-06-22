# docs

The documentation site for [deltached](../../packages/deltached), built with
[Astro](https://astro.build). It hosts the home page, live examples, the API
docs, the roadmap, and the changelog.

This app is private — it is never published to npm.

The package changelog at `packages/deltached/CHANGELOG.md` is loaded as an
Astro content collection and rendered at `/changelog`; do not maintain a
second release list in this app.

## Develop

From the repository root:

```bash
pnpm dev            # start the dev server (this app)
```

Or from this directory:

```bash
pnpm dev            # astro dev
pnpm build          # astro build → ./dist
pnpm preview        # preview the production build
```

## Structure

```
src/
  pages/        Routes (home, examples, docs, roadmap, changelog)
  layouts/      Base shell (nav, fonts, view transitions)
  components/   Shared UI; components/docs holds the docs primitives
  examples/     The interactive example sections + registry
  scripts/      Per-page client behavior, wired in scripts/main.ts
  styles/       Global tokens and base styles
  data/         Content for examples and docs snippets
```

Syntax highlighting is done at build time with [Shiki](https://shiki.style);
multi-language code blocks use a custom segmented-control tab component.

## Deployment

Pushes to `main` build and deploy the site to GitHub Pages through
`.github/workflows/docs.yml`. The workflow enables the `/deltached` base path
only for production, so local development continues to use `/`.
