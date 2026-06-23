import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const fail = (message) => {
  console.error(`\nRelease blocked: ${message}\n`);
  process.exit(1);
};

const packagesDir = path.join(root, "packages");

// Every publishable package under packages/* (core + framework wrappers).
const publishable = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    manifest: JSON.parse(
      readFileSync(path.join(packagesDir, entry.name, "package.json"), "utf8"),
    ),
  }))
  .filter(({ manifest }) => manifest.private !== true);

const unversioned = publishable.filter(
  ({ manifest }) => manifest.version === "0.0.0",
);

if (unversioned.length > 0) {
  fail(
    `the release PR has not versioned yet: ${unversioned
      .map(({ manifest }) => manifest.name)
      .join(", ")}`,
  );
}

const pendingChangesets = readdirSync(path.join(root, ".changeset")).filter(
  (file) => file.endsWith(".md") && file !== "README.md",
);

if (pendingChangesets.length > 0) {
  fail(
    `pending changesets must be consumed by the release PR: ${pendingChangesets.join(", ")}`,
  );
}

const git = (...args) => {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });

  if (result.status !== 0) {
    fail(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }

  return result.stdout.trim();
};

const branch = git("branch", "--show-current");

if (branch !== "main") {
  fail(`releases must run from main, not ${branch || "a detached HEAD"}`);
}

if (git("status", "--porcelain")) {
  fail("commit or discard all working-tree changes before publishing");
}

console.log(
  `Release checks passed for ${publishable
    .map(({ manifest }) => `${manifest.name}@${manifest.version}`)
    .join(", ")}.`,
);
