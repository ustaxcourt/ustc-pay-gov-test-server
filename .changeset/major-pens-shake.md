---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

PAY-299: Stop overloading `NODE_ENV` to encode deployment topology. Restrict
`NODE_ENV` to its three legal values (`development | production | test`) and
introduce a new `APP_ENV` variable (`local | dev | test`) for the deployment
context. Read `APP_ENV` through the typed accessor in `src/config/appEnv.ts`
(`getAppEnv()`, `isLocal()`, `isDeployed()`); the TypeScript compiler now
rejects any string equality between `NODE_ENV` and disallowed values like
`"local"` or `"prod"`.

Also fixes a latent bug in `src/client/storageClient.ts` — the previous
`switch` returned `undefined` for any `NODE_ENV` value other than `"local"`
or `"development"` (including `"production"`, the value the README
documented). The new branch uses `isLocal()` and always returns a valid
client.

Adds the missing `.env.example` referenced by `running-locally.md`. Deployed
environments get their configuration from Terraform — see
[ADR 0004](doc/architecture/decisions/0004-app-env-vs-node-env.md).
