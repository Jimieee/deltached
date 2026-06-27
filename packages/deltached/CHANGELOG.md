# deltached

## 0.1.1

### Patch Changes

- 66defd2: Warn when `enter()` measures the target as 0×0 — almost always a target left at
  `display: none` that `beforeEnter` never revealed, which would otherwise morph
  silently from nothing.

## 0.1.0

### Minor Changes

- 1d6a854: Initial release of the interruptible shared-element morph controller, including
  origin placement, reduced-motion handling, lifecycle hooks, and persistence for
  text, images, canvas, and surfaces.
