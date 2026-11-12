---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

PAY-507: dependency updates for the week of 2026-11-09.

- Raise the runtime floors to the versions tested in this pass:
  `@aws-sdk/client-s3` `^3.1167.0`, `dotenv` `^18.0.10` and `fast-xml-parser`
  `^5.12.0`. Move the dev-only `concurrently` exact pin to `10.0.7`.
- Fix the high `follow-redirects` advisory (GHSA-mrwp-f3q8-3g9p) by refreshing
  it to `1.16.3`. It comes in only through the dev-only `soap` → `axios` chain
  used by the integration tests, so it never reached consumers of this package.
- Accept the moderate `glob` (GHSA-3g3m-2fjr-6pw4) and `minimatch`
  (GHSA-g3hv-75wg-m249) advisories and the low `deepmerge` advisory
  (GHSA-gcqx-w48m-w2h4). All three are dev-only under Jest, jest pins the
  vulnerable majors, and none is reachable here. See
  `docs/dependency-caveats.md`.

Refresh the lock file's in-range transitive updates. Runtime ones include:

- `qs` `6.17.1` and `encodeurl` `2.0.2` under `express`
- `tslib` `2.9.1`
- AWS SDK internals: `@aws-sdk/*`, `@smithy/*`, `bowser`, `is-unsafe`

`npm audit --omit=dev` reports no findings.

TypeScript stays on 6.x; see `docs/dependency-caveats.md`.
