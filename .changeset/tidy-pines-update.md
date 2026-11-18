---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

PAY-508: dependency updates for the week of 2026-11-16.

- Refresh the lock file's in-range updates, including `@aws-sdk/client-s3`
  `3.1171.0` and `fast-xml-parser` `5.12.1`. A fresh install resolves these;
  consumers with a lock file keep their current versions until they refresh it
  (e.g. `npm update`).
- Move `.nvmrc` to Node `24.22.3`. `engines` is unchanged, so consumers are not
  required to upgrade Node.
- Add an `allowScripts` policy to `package.json`: install scripts run for
  `esbuild` and are denied for `@parcel/watcher`. Neither affects consumers of
  the published package.
- The AWS provider stays at `6.73.0` in both Terraform stacks, which is the
  latest release.
