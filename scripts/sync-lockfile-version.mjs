// Sync package-lock.json's version to package.json after `changeset version`.
// Use `npm version` (version-only), NOT `npm install --package-lock-only`: the
// latter re-resolves and prunes other platforms' optional deps, breaking npm ci
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

execSync(
  `npm version ${version} --allow-same-version --no-git-tag-version --ignore-scripts`,
  { stdio: "inherit" },
);
