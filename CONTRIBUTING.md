# Contributing to deltached

Thanks for your interest — contributions of every size are welcome. This guide
keeps the process short and predictable.

## Ways to contribute

- **Report a bug** — open an [issue](https://github.com/Jimieee/deltached/issues/new/choose)
  with a minimal reproduction.
- **Request a feature** — open an issue describing the problem first; the
  [roadmap](./apps/docs/src/pages/roadmap.astro) shows where things are headed.
- **Ask a question or share an idea** — use
  [Discussions](https://github.com/Jimieee/deltached/discussions).
- **Send a pull request** — see below.

## Development setup

You need [Node.js](https://nodejs.org) 22.12+ and the pnpm version declared in
the root `package.json`. Corepack can install that exact version for you.

```bash
git clone https://github.com/Jimieee/deltached.git
cd deltached
pnpm install

pnpm dev            # run the docs site while you work
pnpm build:lib      # build the library
pnpm --filter deltached typecheck
pnpm format         # format the library with Prettier
pnpm test:e2e       # run the Playwright suite (see test:e2e:install)
```

The end-to-end tests use Playwright. Fetch the browser once with
`pnpm test:e2e:install`; on Linux that also pulls the required system libraries.

Project layout:

```
packages/deltached   The library (published to npm)
apps/docs            The documentation site (Astro)
```

## Pull request workflow

1. **Open an issue first** for anything beyond a small fix, so the approach can
   be agreed before you write code.
2. **Branch** from `main` (e.g. `feat/origin-rtl`, `fix/leave-resume`).
3. **Make the change.** Keep it focused — one concern per PR.
4. **Add a changeset** for a user-facing library change:
   ```bash
   pnpm changeset
   ```
   While deltached is below 1.0, use `patch` for backwards-compatible fixes and
   `minor` for features or breaking changes. Reserve `major` for the eventual
   1.0 release. Documentation, examples, tests, and internal refactors do not
   need a changeset unless published behavior changes.
5. **Verify** it builds, types pass, formatting is clean, and tests pass:
   `pnpm build`, `pnpm --filter deltached typecheck`, `pnpm format:check`, and
   `pnpm test:e2e`.
6. **Open the PR** against `main`, fill in the template, and link the issue.

## Release workflow

Changesets keeps one release pull request up to date on `main`. That pull
request consumes pending changesets and updates the package version, lockfile,
and `packages/deltached/CHANGELOG.md`. The documentation renders that changelog
directly, so release notes are written only once.

Publishing remains an explicit maintainer action:

```bash
pnpm release
git push --follow-tags
```

`pnpm release` typechecks and builds the package before publishing it. For the
first release, publish interactively with npm 2FA. Create the GitHub Release
from the generated `deltached@<version>` tag. Tokenless trusted publishing can
replace the interactive step after the package exists on npm.

Maintainers should follow the complete
[release checklist](./.github/RELEASING.md).

## Coding guidelines

- **TypeScript, strict.** No `any` escapes that hide real types.
- **Comment the _why_, not the _what_.** The codebase explains the reasoning
  behind non-obvious choices (pinning, the handoff window, viewport clamping);
  match that style rather than narrating the code.
- **Match the surrounding code** — naming, formatting, and structure.
- **Keep the public surface small.** New API has to earn its place; prefer
  composing existing primitives.

### The two non-negotiables

These are the invariants that keep the library trustworthy — a change that
breaks either won't be merged:

1. **Interruptibility.** Every transition must survive being reversed at any
   phase. If a feature can't be cleanly interrupted, it isn't done.
2. **The core only measures and animates.** Focus, scroll-lock, ARIA, and
   mounting belong in consumer code or an opt-in package — never in the core.

## Code of Conduct

By participating you agree to uphold the
[Code of Conduct](./.github/CODE_OF_CONDUCT.md).
