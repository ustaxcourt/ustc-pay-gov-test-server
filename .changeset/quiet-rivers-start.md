---
"@ustaxcourt/ustc-pay-gov-test-server": minor
---

PAY-494: fix the `start-pay-gov-test-server` command for consumers of the
published package, and stop shipping build-only files and dependencies.

- The command failed in 0.4.0. It ran `npm run dev`, which compiles with `tsc`
  (the published `src/` includes test files importing dev-only packages such as
  `@jest/globals` and `cheerio`), then needs `concurrently`, a dev dependency
  that consumers never get. It now runs the prebuilt `dist/server.js` with
  `APP_ENV=local`.
- The command now finds its package folder from its own location. It
  previously used `npm root`, which broke when run from another directory, from
  a global install, or through `npx` without installing first.
- Add a `files` list so the package ships only `bin/`, `dist/` (minus compiled
  tests), `src/static/` and `CHANGELOG.md`. It drops from about 1.1 MB to
  78 KB unpacked; `terraform/`, tests and docs are no longer published.
- Move `typescript`, `soap` and the `@types/*` packages to `devDependencies`.
  None are used at runtime, and the package doesn't publish type declarations,
  so consumers never received types from it. A consumer install drops from 189
  to 103 packages. A consumer that relied on getting `typescript` or `@types/*`
  through this package must now install them itself.
