---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

PAY-494: dependency updates for the week of 2026-10-12.

- Raise the `express` runtime floor to `^5.3.0`, the version tested in this
  pass. Refresh `package-lock.json` so every declared dependency resolves to
  its latest in-range version, including `@aws-sdk/client-s3` (3.1152.0),
  `dotenv` (18.0.8) and `@types/lodash` (4.17.26).
- Fix the critical `handlebars` (GHSA-xw65-4hp5-5hc7, GHSA-8r5x-fm3f-whwj,
  GHSA-p8wg-vrv2-v86f) and `shell-quote` (GHSA-pqg4-j6r4-53mv) advisories by
  moving `ts-jest` to `^29.4.14` and `concurrently` to `10.0.6`. Both are dev
  dependencies, so neither advisory reached consumers of this package.
- Accept the moderate `sprintf-js` advisory (GHSA-hp3w-g68c-fv3c), which has no
  fixed release and isn't reachable here. See `docs/dependency-caveats.md`.
- Add a `~> 3.9` constraint for the `hashicorp/random` Terraform provider, which
  was locked but unconstrained, and refresh the provider lock files.

No `engines` change. TypeScript stays on 6.x and Terraform on 1.16.x; see
`docs/dependency-caveats.md` for both.
