import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "@jest/globals";

// Guards against accidental reintroduction of `NODE_ENV=local` (or other
// non-Node values) in scripts, workflows, and env templates. The TypeScript
// type narrowing in src/types/environment.d.ts catches this in source code,
// but those files aren't TypeScript — this test closes the gap. See ADR 0004.

const LEGAL_NODE_ENVS = ["development", "production", "test"];

const guardedFiles = [
  "package.json",
  ".env.example",
  ".github/workflows/pr-validate.yml",
  ".github/workflows/deploy.yml",
];

const findNodeEnvAssignments = (relativePath: string): string[] => {
  const content = readFileSync(resolve(__dirname, "../..", relativePath), "utf8");
  const matches = content.matchAll(/NODE_ENV\s*=\s*['"]?([a-zA-Z]+)['"]?/g);
  return Array.from(matches, (m) => m[1]);
};

describe("NODE_ENV anti-pattern guard", () => {
  it.each(guardedFiles)(
    "%s only assigns legal Node values to NODE_ENV",
    (file) => {
      const assignments = findNodeEnvAssignments(file);
      const illegal = assignments.filter((v) => !LEGAL_NODE_ENVS.includes(v));
      expect(illegal).toEqual([]);
    },
  );
});
