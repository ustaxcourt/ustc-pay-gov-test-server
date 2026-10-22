---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

PAY-499: dependency updates for the week of 2026-10-19.

- Raise the `@aws-sdk/client-s3` runtime floor to `^3.1155.0` and the
  `@types/lodash` dev floor to `^4.17.27`, the versions tested in this pass.
- Drop the `glob` override, which jest now satisfies on its own. The resolved
  dependency tree is unchanged.
- Move `.nvmrc` to Node `24.22.1`, a security release. `engines` is unchanged,
  so consumers are not required to upgrade Node.
- Move Terraform to `~> 1.17.0` in both stacks and CI, and refresh the AWS
  provider lock to `6.70.0`.

Refresh the lock file's in-range transitive updates, including `body-parser`
`2.4.0` (high, GHSA-27r3-jxmh-p828) and `qs` `6.16.1` (moderate,
GHSA-6pq8-jhm2-2vcw), both under `express`. Neither is reachable from this
package's code, and consumers pick them up on their own next install. Update
the dev-only `undici` (via `cheerio`) to `7.30.1` for the October undici
advisories. The moderate `sprintf-js`
advisory (GHSA-hp3w-g68c-fv3c) stays accepted. TypeScript stays on 6.x; see
`docs/dependency-caveats.md`.
