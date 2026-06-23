<div align="center">

<img alt="@deltached/react" src="https://raw.githubusercontent.com/Jimieee/deltached/main/assets/banner.png" width="640" />

# @deltached/react

<!-- On publish, swap the pre-release badge for the live npm version:
[![npm](https://img.shields.io/npm/v/@deltached/react?style=for-the-badge&logo=npm&logoColor=white&labelColor=171717&color=171717)](https://www.npmjs.com/package/@deltached/react) -->
[![React](https://img.shields.io/badge/React-171717?style=for-the-badge&logo=react&logoColor=white&labelColor=171717)](https://react.dev) [![Status](https://img.shields.io/badge/status-pre--release-f59e0b?style=for-the-badge&labelColor=171717)](#installation) [![License](https://img.shields.io/badge/license-MIT-171717?style=for-the-badge&labelColor=171717)](https://github.com/Jimieee/deltached/blob/main/LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-171717?style=for-the-badge&logo=typescript&logoColor=white&labelColor=171717)](https://www.typescriptlang.org)

</div>

> React bindings for [deltached](https://github.com/Jimieee/deltached) — a thin `useDeltached` hook over the vanilla morph controller.

`useDeltached` owns the controller's setup and teardown and surfaces the
transition phase as React state. You keep your JSX; deltached measures and
animates.

## Installation

> **Pre-release — not on npm yet.** The first release is in preparation. Once
> published, install with:
>
> ```bash
> npm install @deltached/react deltached gsap
> ```

`deltached` and [GSAP](https://gsap.com) are peer dependencies — install them
alongside.

## Quick start

```tsx
import { useDeltached } from "@deltached/react";

function Panel() {
  const { sourceRef, targetRef, enter, leave } = useDeltached({
    placement: "origin-bottom",
  });

  return (
    <>
      <button ref={sourceRef} onClick={() => enter()}>
        Open
      </button>

      <div ref={targetRef} className="panel">
        <button onClick={() => leave()}>Close</button>
        <h2>Now you see me</h2>
      </div>
    </>
  );
}
```

The hook hides the target at rest and reveals it for the morph, so there is no
`hidden={!isOpen}` to get wrong (pass `autoHide: false` to manage visibility
yourself). `enter()` grows from the element on `sourceRef`; override per call
with `enter({ from, placement })`.

## What you get

- **Reactive state** — `phase` (`idle | entering | open | leaving`), plus
  `isOpen` and `isAnimating`.
- **Lifecycle-managed** — the controller is created when the target mounts and
  destroyed when it unmounts, and visibility is handled for you.
- **Escape hatch** — `controller` exposes the underlying `DeltachedTransition`.
- **SSR-safe** — nothing runs on the server.

## Documentation

- [Docs](https://jimieee.github.io/deltached/docs/) — concepts and full API.
- [Examples](https://jimieee.github.io/deltached/examples/) — live patterns.

## License

Released under the [MIT](https://github.com/Jimieee/deltached/blob/main/LICENSE) license.
