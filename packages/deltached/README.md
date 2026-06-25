<div align="center">

<img alt="deltached" src="https://raw.githubusercontent.com/Jimieee/deltached/main/assets/banner.png" width="640" />

<!-- On publish, swap the pre-release badge for the live npm version:
[![npm](https://img.shields.io/npm/v/deltached?style=for-the-badge&logo=npm&logoColor=white&labelColor=171717&color=171717)](https://www.npmjs.com/package/deltached) -->

[![Status](https://img.shields.io/badge/status-pre--release-f59e0b?style=for-the-badge&labelColor=171717)](#installation) [![License](https://img.shields.io/badge/license-MIT-171717?style=for-the-badge&labelColor=171717)](https://github.com/Jimieee/deltached/blob/main/LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-171717?style=for-the-badge&logo=typescript&logoColor=white&labelColor=171717)](https://www.typescriptlang.org) [![Docs](https://img.shields.io/badge/docs-deltached-171717?style=for-the-badge&logo=readthedocs&logoColor=white&labelColor=171717)](https://jimieee.github.io/deltached)

</div>

> An interruptible, in-page shared-element morph controller for the web.

deltached is not a modal library — it's a morph controller. You give it two
elements, a **source** and a **target**, and it animates one growing into the
other: a button into a form, a thumbnail into a lightbox, a field into a
dropdown. The same controller plays it back in reverse on close, survives being
interrupted mid-flight, and can carry marked children between the two layouts.

Everything visual stays yours; deltached only measures and animates.

## Installation

> **Pre-release — not on npm yet.** The first release is in preparation. Once
> published, install with:
>
> ```bash
> npm install deltached gsap
> ```

[GSAP](https://gsap.com) is a peer dependency.

## Quick start

```html
<button id="trigger">Open panel</button>

<div id="panel" hidden>
  <button data-close>Close</button>
  <h2>Now you see me</h2>
</div>
```

```ts
import { createDeltachedTransition } from "deltached";

const trigger = document.querySelector<HTMLElement>("#trigger")!;
const panel = document.querySelector<HTMLElement>("#panel")!;

const transition = createDeltachedTransition({
  target: panel, // destination + the surface that morphs
  source: trigger, // where it grows from
  hooks: {
    beforeEnter: () => (panel.hidden = false), // make it measurable
    afterLeave: () => (panel.hidden = true), // hide it once it has left
  },
});

trigger.addEventListener("click", () => transition.enter());
panel
  .querySelector("[data-close]")!
  .addEventListener("click", () => transition.leave());
```

## What you get

- **Interruptible by design.** The target is pinned out of flow and animated in
  rect space (translate + width/height, never scale), so reversing a transition
  mid-flight never tears the DOM.
- **Placement.** Settle wherever your CSS centers it, or anchor to the source
  with the viewport-clamped `origin` family (`origin-bottom`, `origin-auto`, …).
- **Shared-element persistence.** Children marked with a matching
  `data-deltached-id` fly between layouts as their own layer — image, text,
  canvas, or a cloned surface.
- **Tunable timings**, lifecycle hooks, an optional synced backdrop, and an
  automatic `prefers-reduced-motion` fallback.
- **SSR-safe** and shipped as ESM + CJS with TypeScript types.

## Documentation

- [Docs](https://jimieee.github.io/deltached/docs/) — concepts, API reference,
  and framework guides (React, Vue, Angular, Svelte).
- [Examples](https://jimieee.github.io/deltached/examples/) — live patterns.
- [Roadmap](https://jimieee.github.io/deltached/roadmap/) · [Changelog](https://jimieee.github.io/deltached/changelog/)

## License

The scripts and documentation in this project are released under the [MIT](https://github.com/Jimieee/deltached/blob/main/LICENSE)
