# Releasing deltached

Releases are intentionally reviewed and published by a maintainer. Regular
pull requests never publish a package.

## Repository setup

These settings are required once:

1. In **Settings → Actions → General**, allow GitHub Actions to create pull
   requests.
2. In **Settings → Pages**, select **GitHub Actions** as the source.
3. Keep `main` protected and require the CI and dependency-review checks.

## Prepare a release

1. User-facing package pull requests add a changeset with `pnpm changeset`.
2. After they land on `main`, the Release PR workflow creates or updates
   `chore: release packages`.
3. Review the proposed version and `packages/deltached/CHANGELOG.md`.
4. Approve the Release PR's workflow runs when GitHub requests it, then merge
   only after all required checks pass.

The initial changeset moves the unpublished package from `0.0.0` to `0.1.0`.

## Publish

From a clean, up-to-date local `main` branch:

```bash
git switch main
git pull --ff-only
npm login
pnpm release
git push --follow-tags
```

The release guard refuses to publish from another branch, with uncommitted
changes, with pending changesets, or before the initial Release PR. npm should
prompt for 2FA. Changesets creates the `deltached@<version>` tag locally.

Finally, create a GitHub Release from that tag and use the matching section of
`packages/deltached/CHANGELOG.md` as its notes. Never create a second `v<version>`
tag for the same package release.

## After the first release

Configure npm Trusted Publishing for this repository before automating the
publish step. Prefer short-lived OIDC credentials over storing an `NPM_TOKEN`.
Until that workflow exists and has been tested, keep publishing interactive.

If npm succeeds but pushing the tag fails, do not republish or change the
version. Fix the GitHub access problem and push the existing tag.
