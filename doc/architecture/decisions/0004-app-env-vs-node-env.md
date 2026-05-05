# 4. Separate APP_ENV from NODE_ENV

Date: 2026-04-30

## Status

Accepted

## Context

`NODE_ENV` is a Node.js-specific runtime variable with three legal values:
`development`, `production`, and `test`. Several frameworks (Express, Jest,
and many libraries) branch on it to enable verbose error pages, disable
caches, or load test fixtures.

This repo had been overloading `NODE_ENV` to also encode deployment topology.
The committed values seen in code, scripts, README, and `.env` files included
`local`, `prod`, and `development`. The `src/client/storageClient.ts` switch
treated `NODE_ENV === "development"` as "deployed environment, use S3" and
`NODE_ENV === "local"` as "local dev, use the filesystem." Anything else
silently returned `undefined`, including `NODE_ENV=production` (the value the
README documented), `NODE_ENV=prod` (set by the `test:integration:prod`
script), and `NODE_ENV=test` (Jest's automatic value).

Mixing the two concepts caused three problems:

1. **Latent bugs.** The storage client crashed any caller that hit the
   un-handled cases.
2. **Type-system drift.** `src/types/environment.d.ts` declared
   `NODE_ENV: "local" | "development"` — a lie relative to what the code,
   scripts, and README actually used.
3. **No durable guardrail.** Nothing prevented the next contributor from
   adding another illegal value (`staging`, `qa`, …).

## Decision

Use two variables with non-overlapping value spaces:

| Variable   | Purpose                          | Legal values                          |
| ---------- | -------------------------------- | ------------------------------------- |
| `NODE_ENV` | Node.js runtime mode             | `development` \| `production` \| `test` |
| `APP_ENV`  | Deployment topology              | `local` \| `dev` \| `test`            |

`APP_ENV` is read only through the typed accessor in
[`src/config/appEnv.ts`](../../../src/config/appEnv.ts):
`getAppEnv()`, `isLocal()`, `isDeployed()`. Direct access to
`process.env.APP_ENV` from application code is discouraged — the accessor
validates the value and fails fast at cold start on misconfiguration.

`src/types/environment.d.ts` narrows `NODE_ENV` to its three legal values, so
the TypeScript compiler rejects any new code that compares `NODE_ENV` against
strings like `"local"` or `"prod"` going forward.

A `prod` value for `APP_ENV` is intentionally not added until there is a real
production deployment of this service to justify it.

## Consequences

- **Type-system enforcement.** `NODE_ENV === "local"` is now a TypeScript
  compile error. Any future drift surfaces in `tsc`, not in runtime.
- **Storage-client bug fixed.** The branch is now `isLocal() ? local : S3`,
  which always returns a valid client.
- **Deployed-env runtime mode change.** The deployed dev environment
  previously ran with `NODE_ENV=development`. It now runs with
  `NODE_ENV=production` (the deployment topology is carried by `APP_ENV=dev`
  instead). Express stops serving verbose error pages in this state — closer
  prod parity. The S3 branch in the storage client is now selected via
  `isDeployed()` rather than literal-matching `NODE_ENV`.
- **Single source of truth for "where am I running."** Every check that used
  to read `process.env.NODE_ENV` now goes through `appEnv.ts`. Adding a new
  deployment env (e.g., `prod`) is a one-line union extension plus updating
  `isDeployed()`.

## References

- [PAY-299 implementation plan](../../PAY-299-plan.md)
- [`src/config/appEnv.ts`](../../../src/config/appEnv.ts) — typed accessor
- [`src/types/environment.d.ts`](../../../src/types/environment.d.ts) —
  narrowed `ProcessEnv` interface
