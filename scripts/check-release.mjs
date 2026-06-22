import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const fail = (message) => {
  console.error(`\nRelease blocked: ${message}\n`);
  process.exit(1);
};

const packageJson = JSON.parse(
  readFileSync(path.join(root, "packages/deltached/package.json"), "utf8"),
);

if (packageJson.version === "0.0.0") {
  fail("the initial release PR has not versioned deltached yet");
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

console.log(`Release checks passed for deltached@${packageJson.version}.`);
