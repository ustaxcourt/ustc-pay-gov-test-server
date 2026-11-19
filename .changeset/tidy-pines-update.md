---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

PAY-508: dependency updates for the week of 2026-11-16.

- Refresh the lock file's in-range updates, including `@aws-sdk/client-s3`
  `3.1171.0` and `fast-xml-parser` `5.12.1`. A fresh install resolves these;
  consumers with a lock file keep their current versions until they refresh it
  (e.g. `npm update`).
- Runtime dependency updates pulled in transitively through `express`:
  `router` `2.3.0` and `encodeurl` `2.0.3`. The same lock file caveat applies.
- Move `.nvmrc` to Node `24.22.3`, the
  [November 2026 Node security release](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases)
  (16 CVEs, 7 high, mostly HTTP/2 and TLS server; see
  `docs/dependency-caveats.md`). `engines` is unchanged, so consumers are not
  required to upgrade Node. The Lambdas run the AWS-managed runtime, so they
  get the fix only when AWS ships it.
- Add an `allowScripts` policy to `package.json`: install scripts run for
  `esbuild` and are recorded as denied (advisory until npm enforces it) for
  `@parcel/watcher`. Neither affects consumers of the published package.
- The AWS provider stays at `6.73.0` in both Terraform stacks, which is the
  latest release.
