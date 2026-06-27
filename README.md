<div align="center">

<img alt="Deltached." src="./assets/banner.png" width="640" />

<p><strong>An interruptible, in-page shared-element morph controller for the web.</strong></p>

[![npm](https://img.shields.io/npm/v/deltached?style=for-the-badge&logo=npm&logoColor=white&labelColor=171717&color=171717)](https://www.npmjs.com/package/deltached) [![License](https://img.shields.io/badge/license-MIT-171717?style=for-the-badge&labelColor=171717)](./LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-171717?style=for-the-badge&logo=typescript&logoColor=white&labelColor=171717)](https://www.typescriptlang.org) [![Docs](https://img.shields.io/badge/docs-deltached-171717?style=for-the-badge&logo=readthedocs&logoColor=white&labelColor=171717)](https://jimieee.github.io/deltached)

</div>

deltached is not a modal library — it's a morph controller. You give it two
elements, a **source** and a **target**, and it animates one growing into the
other: a button into a form, a thumbnail into a lightbox, a field into a
dropdown. The same controller plays it back in reverse on close, survives being
interrupted mid-flight, and can carry marked children between the two layouts.

Everything visual stays yours; deltached only measures and animates.

## Highlights

- **Interruptible by design** — the target is the surface, animated in rect space
  (translate + width/height, never scale), so rapid open/close never tears the DOM.
- **Placement** — settle where your CSS centers it, or anchor to the source with
  the viewport-clamped `origin` family (dropdowns, popovers, menus).
- **Shared-element persistence** — children with a matching `data-deltached-id`
  fly between layouts as their own layer (image, text, canvas, surface).
- **Small and framework-agnostic** — works with plain DOM; thin wrappers are
  available for React, Vue, and Svelte.

## Install

```bash
npm install deltached gsap
```

[GSAP](https://gsap.com) is a peer dependency.

## Quick start

```ts
import { createDeltachedTransition } from "deltached";

const transition = createDeltachedTransition({
  target: panel, // destination + the surface that morphs
  source: trigger, // where it grows from
  hooks: {
    beforeEnter: () => (panel.hidden = false),
    afterLeave: () => (panel.hidden = true),
  },
});

trigger.addEventListener("click", () => transition.enter());
closeButton.addEventListener("click", () => transition.leave());
```

See the [package README](./packages/deltached/README.md) for the full example.

## Packages

| Package                                  | Description                     |
| ---------------------------------------- | ------------------------------- |
| [`deltached`](./packages/deltached)      | Core DOM morph controller.      |
| [`@deltached/react`](./packages/react)   | React hook bindings.            |
| [`@deltached/vue`](./packages/vue)       | Vue composable bindings.        |
| [`@deltached/svelte`](./packages/svelte) | Svelte attachment bindings.     |
| [`docs`](./apps/docs)                    | The documentation site (Astro). |

## Documentation

The docs site (in [`apps/docs`](./apps/docs)) covers concepts, the full API
reference, framework guides, a roadmap, and a changelog. Browse the
[live documentation](https://jimieee.github.io/deltached/) or run it locally
with `pnpm dev` (see below).

## Development

This is a [pnpm](https://pnpm.io) workspace. Development uses Node.js 22.12+
and the pnpm version pinned in `package.json`.

```bash
pnpm install        # install everything
pnpm dev            # run the docs site
pnpm build:lib      # build the library
pnpm build          # build the library, then the docs site
```

| Script                  | What it does                          |
| ----------------------- | ------------------------------------- |
| `pnpm dev`              | Start the docs site in dev mode.      |
| `pnpm build:lib`        | Build `packages/deltached`.           |
| `pnpm build`            | Build the library and the docs site.  |
| `pnpm changeset`        | Record a change for the next release. |
| `pnpm changeset:status` | Preview the pending release plan.     |

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md)
before opening a pull request, and note the
[Code of Conduct](./.github/CODE_OF_CONDUCT.md).

## License

The scripts and documentation in this project are released under the [MIT](./LICENSE)
