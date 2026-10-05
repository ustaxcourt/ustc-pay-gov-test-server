---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

PAY-472: dependency updates for 2026-09-28 to 2026-10-09.

- Remove `nodemon` and run the local dev server with Node's built-in
  `node --watch` instead (`npm run dev`). `nodemon` was only used by that one
  script, but it was declared in `dependencies`, so it shipped to production
  installs. Removing it also drops its `chokidar`/`braces` chain, which
  `npm audit` began flagging (GHSA-vfj7-8cjw-p6xm, high) with no non-breaking
  fix available.
- Refresh `package-lock.json` so every declared dependency resolves to its
  latest in-range version, including `@aws-sdk/client-s3` (3.1146.0), `soap`
  (1.13.2), `fast-xml-parser` (5.11.2), `dotenv` (18.0.5), `@types/aws-lambda`
  (8.10.164), `@types/luxon` (3.7.6) and the dev dependency `ts-jest` (29.4.14).
- Refresh the Terraform provider lockfiles to `hashicorp/aws` 6.67.0 (main and
  bootstrap stacks).
- Pin the CI Terraform version to `~> 1.16.0` in the deploy and PR-validate
  workflows so patch releases are picked up automatically. (Major and minor updates require human intervention)

TypeScript remains on 6.x; see `docs/dependency-caveats.md` for the reasoning.
