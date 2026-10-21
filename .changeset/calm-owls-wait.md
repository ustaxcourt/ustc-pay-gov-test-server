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
- Refresh the Terraform AWS provider lock to `6.69.1`.

No vulnerability was fixed this round; the moderate `sprintf-js` advisory
(GHSA-hp3w-g68c-fv3c) stays accepted. TypeScript stays on 6.x and Terraform on
1.16.x; see `docs/dependency-caveats.md` for both.
