<div align="center">

<img alt="@deltached/vue" src="https://raw.githubusercontent.com/Jimieee/deltached/main/assets/banner.png" width="640" />

# @deltached/vue

[![Vue](https://img.shields.io/badge/Vue-171717?style=for-the-badge&logo=vuedotjs&logoColor=white&labelColor=171717)](https://vuejs.org) [![npm](https://img.shields.io/npm/v/@deltached/vue?style=for-the-badge&logo=npm&logoColor=white&labelColor=171717&color=171717)](https://www.npmjs.com/package/@deltached/vue) [![License](https://img.shields.io/badge/license-MIT-171717?style=for-the-badge&labelColor=171717)](https://github.com/Jimieee/deltached/blob/main/LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-171717?style=for-the-badge&logo=typescript&logoColor=white&labelColor=171717)](https://www.typescriptlang.org)

</div>

> Vue bindings for [deltached](https://github.com/Jimieee/deltached) — a thin `useDeltached` composable over the vanilla morph controller.

`useDeltached` owns the controller's setup and teardown and surfaces the
transition phase as reactive refs. You keep your template; deltached measures
and animates.

## Installation

```bash
npm install @deltached/vue deltached gsap
```

`deltached` and [GSAP](https://gsap.com) are peer dependencies — install them
alongside.

## Quick start

```vue
<script setup lang="ts">
import { useDeltached } from "@deltached/vue";

const { sourceRef, targetRef, enter, leave } = useDeltached({
  placement: "origin-bottom",
});
</script>

<template>
  <button :ref="sourceRef" @click="enter()">Open</button>

  <div :ref="targetRef" class="panel">
    <button @click="leave()">Close</button>
    <h2>Now you see me</h2>
  </div>
</template>
```

The composable hides the target at rest and reveals it for the morph, so there
is no `v-show`/`v-if` to get wrong (pass `autoHide: false` to manage visibility
yourself). `enter()` grows from the element on `sourceRef`; override per call
with `enter({ from, placement })`.

## What you get

- **Reactive state** — `phase` (`idle | entering | open | leaving`), plus
  `isOpen` and `isAnimating`.
- **Lifecycle-managed** — the controller is created when the target mounts and
  destroyed with the component, and visibility is handled for you.
- **Escape hatch** — `controller` exposes the underlying `DeltachedTransition`.
- **SSR-safe** — nothing runs on the server.

## Documentation

- [Docs](https://jimieee.github.io/deltached/docs/) — concepts and full API.
- [Examples](https://jimieee.github.io/deltached/examples/) — live patterns.

## License

Released under the [MIT](https://github.com/Jimieee/deltached/blob/main/LICENSE) license.
