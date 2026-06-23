---
"deltached": patch
---

Warn when `enter()` measures the target as 0×0 — almost always a target left at
`display: none` that `beforeEnter` never revealed, which would otherwise morph
silently from nothing.
