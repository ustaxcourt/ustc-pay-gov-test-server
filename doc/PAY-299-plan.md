# PAY-299 — Pay.gov Test Server `NODE_ENV` Refactor: Implementation Plan

## Goal

Stop hijacking `NODE_ENV` to encode deployment topology. Restrict `NODE_ENV` to its three legal values (`development | production | test`), introduce a new `APP_ENV` variable for "where is this code running" (`local | dev | test`), and bring the type system, code, tests, config, infra, and docs into alignment.

While we're here, we also fix a latent bug in `src/client/storageClient.ts` (the function returns `undefined` for any `NODE_ENV` value other than `"local"` or `"development"` — including the `"production"` value the README documents).

## Acceptance criteria (from the ticket)

1. `NODE_ENV` is no longer the driver to determine what environment we are running the application.
2. `.env.example` is updated.
3. `README` is updated.

## Guiding principles

1. **`NODE_ENV` is for the Node runtime, period.** Three legal values. Anything else (even `"prod"`, `"local"`, `"staging"`) is the anti-pattern.
2. **Introduce `APP_ENV` for our deployment topology.** Read it only through a typed accessor (`getAppEnv()` / `isLocal()` / `isDeployed()`).
3. **Type-narrow as enforcement.** Once `environment.d.ts` declares `NODE_ENV: "development" | "production" | "test"`, the TypeScript compiler will reject any code that compares `NODE_ENV === "local"` going forward. That's our durable guardrail.
4. **Fix the storage-client bug while we're in there.** Same change touches the same file; coincident scope.
5. **Stay disciplined on scope.** Don't restructure the SOAP layer, the S3 client, or the tests beyond what the cleanup directly surfaces. Don't add a `prod` value to `APP_ENV` until there's a real prod deployment to justify it.

---

## Phase 1 — Verify scope (already done)

Three greps run against the repo confirmed the scope:

```bash
grep -rn "NODE_ENV" --include="*.ts" --include="*.json" --include="*.tf" --include="*.yml" --include="*.md" --include=".env*" .
grep -rn "process\.env\." src/ --include="*.ts"
ls doc/architecture/decisions/
```

### Verified findings

13 references to `NODE_ENV` across 9 files. Categorized by what they do:

| File | What it does | Action in this plan |
| --- | --- | --- |
| [src/client/storageClient.ts:8](../src/client/storageClient.ts) | `switch (process.env.NODE_ENV)` — picks S3 vs filesystem storage | **Replace with `getAppEnv()`-driven branch.** Fixes the silent-undefined bug. |
| [src/types/environment.d.ts:4](../src/types/environment.d.ts) | declares `NODE_ENV: "local" \| "development"` | Narrow to `"development" \| "production" \| "test"`; add `APP_ENV` union. |
| [test/integration/resources.test.ts:17,18,43](../test/integration/resources.test.ts) | sets/restores `process.env.NODE_ENV = "local"` | Switch to `process.env.APP_ENV = "local"` with proper restore. |
| [test/integration/static-web.test.ts:20](../test/integration/static-web.test.ts) | `process.env.NODE_ENV = "local"` | Same. |
| [test/integration/transaction-http.test.ts:37](../test/integration/transaction-http.test.ts) | `process.env.NODE_ENV = "local"` | Same. |
| [package.json:20](../package.json) | `NODE_ENV='local' jest ...` | Replace with `APP_ENV=local`. |
| [package.json:22](../package.json) | `NODE_ENV='prod' jest ...` | **Worse:** illegal Node value `'prod'`. Replace with `APP_ENV=dev` (matching the deployed env this script targets) — see open question #2. |
| [.github/workflows/pr-validate.yml:49](../.github/workflows/pr-validate.yml) | `NODE_ENV=local` | Replace with `APP_ENV=local`. |
| [terraform/main.tf:59](../terraform/main.tf), [terraform/variables.tf:35](../terraform/variables.tf), [terraform/modules/lambda/variables.tf:52](../terraform/modules/lambda/variables.tf), [terraform/modules/lambda/lambda.tf:62](../terraform/modules/lambda/lambda.tf) | passes `node_env` from root → module → Lambda env block | Add parallel `app_env` variable + plumb through. Set `node_env = "production"` (deployed = production-mode), `app_env = "dev"`. |
| [README.md:39](../README.md) | env-var table claims values are `local \| production` | Rewrite per AC #3 — explain `.env` is local-only, deployed config from Terraform. |
| [running-locally.md:11](../running-locally.md) | tells dev to paste `NODE_ENV=local` into their `.env` | Update once `.env.example` exists; instruction becomes `cp .env.example .env`. |

### Bug discovered during the audit (in scope, fixed in Phase 3.1)

`src/client/storageClient.ts` is a `switch` with **no default case**:

- `NODE_ENV === "local"` → returns local storage client
- `NODE_ENV === "development"` → returns S3 client
- Anything else → returns `undefined`

The README claims `NODE_ENV=production` is a supported value. The function returns `undefined` for that value. The `package.json` `test:integration:prod` script sets `NODE_ENV='prod'` (illegal Node value) — also returns `undefined`. Jest auto-sets `NODE_ENV=test` — also returns `undefined`. Anyone calling `storageClient()` in any of those situations crashes with `Cannot read properties of undefined`.

The PAY-299 refactor fixes this incidentally — once we move to `APP_ENV` for branching, the gate becomes "is this a deployed env" not "is the env string exactly one of two literals."

---

## Phase 2 — Foundation

### 2.1 New module: `src/config/appEnv.ts`

Single chokepoint for reading `APP_ENV`. Same shape as the payment portal's, scaled to this repo's smaller value space.

```ts
/**
 * Single source of truth for APP_ENV (deployment topology). Read APP_ENV
 * only through these helpers — validation lives here so unknown values
 * fail fast at cold start.
 */

export const APP_ENVS = ["local", "dev", "test"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const isAppEnv = (value: string): value is AppEnv =>
  (APP_ENVS as readonly string[]).includes(value);

/**
 * Throws on unset or unrecognized APP_ENV — fail fast beats silent
 * miscategorization. Falls back to "test" when only Jest's auto-set
 * NODE_ENV=test is present, so unit tests don't have to set both.
 */
export const getAppEnv = (): AppEnv => {
  const raw = process.env.APP_ENV;

  if (!raw) {
    if (process.env.NODE_ENV === "test") {
      return "test";
    }
    throw new Error("APP_ENV is not set");
  }

  if (!isAppEnv(raw)) {
    throw new Error(
      `Invalid APP_ENV "${raw}". Expected one of: ${APP_ENVS.join(", ")}`
    );
  }

  return raw;
};

export const isLocal = (): boolean => getAppEnv() === "local";

export const isDeployed = (): boolean => getAppEnv() === "dev";
```

> Note: `isDeployed()` only checks `dev` because that's the only deployed env this repo currently has. If a `prod` deployment ever appears, it's a one-line union extension and `isDeployed()` becomes `dev || prod`.

### 2.2 Tighten `src/types/environment.d.ts`

Current state:

```ts
NODE_ENV: "local" | "development";
```

Already a lie (the README says `production`, the package.json uses `prod`, Jest sets `test`). After this change:

```ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /** Node runtime mode. For deployment topology, use APP_ENV. */
      NODE_ENV: "development" | "production" | "test";
      /** Deployment topology. Read via getAppEnv() — do not access directly. */
      APP_ENV: "local" | "dev" | "test";
      BASE_URL: string;
      BUCKET_NAME: string;
      ACCESS_TOKEN: string;
      PORT: string;
    }
  }
}

export {};
```

The narrowed `NODE_ENV` will surface every illegal `=== "local"` comparison as a TS compile error — that's the checklist for Phase 3.

---

## Phase 3 — Application code migration

### 3.1 `src/client/storageClient.ts` — replace switch + fix the bug

**Before:**

```ts
export function storageClient() {
  switch (process.env.NODE_ENV) {
    case "local":       return { getFile: getFileLocal, saveFile: saveFileLocal };
    case "development": return { getFile: getFileS3,    saveFile: saveFileS3 };
  }
  // ← falls off, returns undefined for production/test/anything else
}
```

**After:**

```ts
import { isLocal } from "../config/appEnv";

export function storageClient() {
  return isLocal()
    ? { getFile: getFileLocal, saveFile: saveFileLocal }
    : { getFile: getFileS3,    saveFile: saveFileS3 };
}
```

Two improvements at once:
1. **No more silent `undefined`.** The function always returns one of two valid objects.
2. **Single semantic gate.** `isLocal()` answers "should I use the filesystem instead of S3?" — which is what the code actually wants to know. The previous switch was conflating "env is local" with "env is development" with no clear semantic.

The `getAppEnv()` accessor will throw at startup if `APP_ENV` is unset or invalid in a deployed env, so we still fail fast on misconfiguration — just in a more accurate place than the storage client returning undefined three calls deep.

---

## Phase 4 — Tests

Three integration test files set `process.env.NODE_ENV = "local"` to trigger the local-storage branch in `storageClient()`. All three switch to `APP_ENV`:

```diff
- process.env.NODE_ENV = "local";
+ process.env.APP_ENV = "local";
```

Files:
- [test/integration/resources.test.ts:17,18,43](../test/integration/resources.test.ts) — saves/restores/sets the value (3 lines)
- [test/integration/static-web.test.ts:20](../test/integration/static-web.test.ts) — single set
- [test/integration/transaction-http.test.ts:37](../test/integration/transaction-http.test.ts) — single set

The `resources.test.ts` file types its restore variable as `"local" | "development"` — that type literal needs to update to `AppEnv` from the new module to match the narrowed semantics.

---

## Phase 5 — Configuration & scripts

### 5.1 Create `.env.example` (new file — addresses ticket AC #2)

The repo doesn't have one today. The README references `.env` and `.env.prod` (the latter doesn't exist). New committed file:

```bash
# URL of this server — used by integration tests and the running app.
BASE_URL=http://localhost:3366
# Shared bearer token for SOAP requests. Match this to the consumer's
# PAY_GOV_DEV_SERVER_TOKEN_SECRET_ID value when wiring up locally.
ACCESS_TOKEN=asdf123
# Express server port for local development. Not used in deployed envs.
PORT=3366
# Node runtime mode. One of: development | production | test.
NODE_ENV=development
# Deployment topology of this server. One of: local | dev | test.
APP_ENV=local
```

### 5.2 Update local `.env` and `.env.dev`

The committed `.env.dev` is empty — leave it alone unless it grows a purpose later.

The local `.env` (gitignored):

```diff
- NODE_ENV=local
+ NODE_ENV=development
+ APP_ENV=local
```

### 5.3 `package.json` scripts

Two scripts misuse `NODE_ENV`:

```diff
- "dev": "NODE_ENV='local' concurrently \"npx tsc --watch\" \"nodemon -q ./dist/server.js\"",
+ "dev": "APP_ENV=local concurrently \"npx tsc --watch\" \"nodemon -q ./dist/server.js\"",

- "test:integration": "NODE_ENV='local' jest --verbose --bail ./test/integration",
+ "test:integration": "APP_ENV=local jest --verbose --bail ./test/integration",

- "test:integration:prod": "DOTENV_CONFIG_PATH=.env.prod NODE_ENV='prod' jest --bail ./test/integration",
+ "test:integration:prod": "DOTENV_CONFIG_PATH=.env.prod APP_ENV=dev jest --bail ./test/integration",
```

`NODE_ENV` falls through to Jest's auto-set value of `test` — which is exactly what these test scripts want.

> The `test:integration:prod` script's name is misleading — it tests against the deployed dev server, not a real "prod" deployment. Renaming it (e.g., to `test:integration:deployed`) would be cleaner but risks scope creep. See open question #2.

### 5.4 `.github/workflows/pr-validate.yml`

Single line:

```diff
-          NODE_ENV=local
+          APP_ENV=local
```

---

## Phase 6 — Terraform

Three files, mirroring the payment portal's pattern. Add `app_env` as a parallel variable to `node_env`, plumb it through, and set the per-env values.

### 6.1 Root: `terraform/variables.tf`

Add the variable declaration:

```diff
 variable "node_env" {
   ...
 }

+variable "app_env" {
+  description = "Deployment topology of this service. One of: local, dev, test."
+  type        = string
+}
```

### 6.2 Root: `terraform/main.tf`

Pass it to the lambda module:

```diff
   node_env                  = var.node_env
+  app_env                   = var.app_env
```

### 6.3 Lambda module: `terraform/modules/lambda/variables.tf`

Re-declare:

```diff
 variable "node_env" { ... }

+variable "app_env" {
+  description = "Deployment topology"
+  type        = string
+}
```

### 6.4 Lambda module: `terraform/modules/lambda/lambda.tf`

Inject into the Lambda env block:

```diff
     NODE_ENV     = var.node_env
+    APP_ENV      = var.app_env
```

### 6.5 Per-env tfvars / locals

Wherever the deployed `node_env` value is currently set (and the locals.tf if there is one), set both:

```hcl
node_env = "production"  # NB: not "development" — see ADR-0004 for why deployed envs run in NODE_ENV=production
app_env  = "dev"         # The deployment topology
```

> **Behavior change to call out.** The deployed env currently runs with `node_env = "development"` (per the storage-client switch). After this change, it runs with `node_env = "production"`, so the storage client picks the S3 path via `isDeployed()` rather than `NODE_ENV === "development"`. Express also stops serving verbose error pages in this state — closer prod parity. Worth confirming via post-deploy smoke test.

---

## Phase 7 — Documentation

### 7.1 [README.md](../README.md) — env-var section

Same shape as PAY-270's final state on the payment portal. Three short paragraphs:

```markdown
## Environment Variables

The `.env` file in this repo is for **local development only** — it provides
the variables a developer needs to run the test server against the local
filesystem (no S3). Deployed environments get their configuration from
Terraform — see [terraform/](terraform/) and
[ADR 0004](doc/architecture/decisions/0004-app-env-vs-node-env.md).

For local setup instructions, see [running-locally.md](running-locally.md).
The full list of variables is in [`.env.example`](.env.example).

### How the environment layer is structured

A few variables have semantic meaning beyond just "set this value":

- **`APP_ENV`** identifies the deployment topology — one of `local`, `dev`,
  or `test`. Read it via `getAppEnv()` / `isLocal()` / `isDeployed()` from
  [`src/config/appEnv.ts`](src/config/appEnv.ts), not directly from `process.env`.
- **`NODE_ENV`** is the Node runtime mode — `development`, `production`, or
  `test`. Set automatically by Jest in test runs.
```

The current env-var table can either be kept (smaller and less drift-prone here than at the payment portal) or dropped. Recommend dropping — the `.env.example` plus the prose above carries the same information without the drift risk. See PAY-270's resolution for the same call.

### 7.2 [running-locally.md](../running-locally.md) — local setup

Currently tells the dev to paste env vars into a freshly-created `.env`. Once `.env.example` exists, simplify:

```diff
- - Create a `.env` file and add the following variables:
-
- ```
- BASE_URL=http://localhost:3366
- ACCESS_TOKEN=asdf123
- PORT=3366
- NODE_ENV=local
- ```
+ - Copy `.env.example` to `.env` (`cp .env.example .env`).
```

### 7.3 New ADR: `doc/architecture/decisions/0004-app-env-vs-node-env.md`

Same structure as the payment portal's ADR-0007, scoped to this repo. Sections:

- **Status:** Accepted
- **Context:** the same anti-pattern (NODE_ENV overloaded for deployment topology), the same set of consequences (Express verbose errors leaking into stg, etc., scaled to this repo's simpler topology).
- **Decision:** the table of two variables with non-overlapping value spaces (`NODE_ENV: dev|prod|test` vs `APP_ENV: local|dev|test`).
- **Consequences:**
  - Type-system enforcement (narrowed `NODE_ENV` rejects `"local"` at compile time).
  - Storage-client bug fixed as a side effect.
  - Deployed env behavior shift (was `NODE_ENV=development` → now `NODE_ENV=production`, picks the S3 path via `isDeployed()` instead of literal-match).
- **References:** link to the implementation plan, the typed accessor, the type narrowing.

---

## Phase 8 — Verification + DoD walk

### 8.1 Gates

```bash
npx tsc --noEmit                 # expect: clean
npm test                          # expect: same pass count
grep -rn "NODE_ENV" --include="*.ts" .   # expect: only legitimate Node-runtime usages
grep -rn "process\.env\.NODE_ENV" src/   # expect: only the appEnv.ts Jest fallback
```

### 8.2 DoD walk

| DoD item | Handling |
| --- | --- |
| All code written + checked in | ✓ |
| All tests pass | ✓ — same pass count, no behavior change |
| No new technical debts | ✓ — removes existing tech debt (the dead types + the storage-client bug) |
| Test coverage ≥ 90% | Same baseline. New `appEnv.ts` adds tests for itself; storage-client test path unchanged. |
| Unit testing | ✓ — new tests for `appEnv.ts`; existing storage-client tests still pass |
| Integration testing | ✓ — 3 integration tests updated, semantics preserved |
| Security testing | N/A — no auth path changes; the `LOCAL_DEV` analog doesn't exist in this repo |
| Performance testing | N/A — refactor with no hot-path changes |
| Documentation | ✓ — README + running-locally.md + new ADR |
| ADR | ✓ — 0004 |
| Changeset | ✓ — Phase 9 |

### 8.3 Risk + rollback

**Production risk:** low. The one behavioral change is the deployed-env `node_env` flip from `development` to `production`, which makes Express stop serving verbose error pages and aligns the storage client's branch via `isDeployed()` instead of the broken `=== "development"` check. Both improvements; neither breaks the existing flow.

**Local-developer risk:** minimal. Anyone pulling this branch with a stale `.env` (`NODE_ENV=local`) will see knex-style "Unknown NODE_ENV" or `getAppEnv()` startup errors until they update. The `.env.example` exists post-merge as a reference.

**Rollback:** `git revert`. No migration, no infrastructure changes that need unwinding beyond a Terraform re-apply.

---

## Phase 9 — Changeset

```bash
npx changeset add --empty
```

Then fill in:

```markdown
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
```

`patch` bump matches house convention for refactors with no public-API surface change.

---

## Open questions for the tech lead

1. **Confirm `.env.example` should be created.** The ticket's AC #2 says "`.env.example` is updated" but the file doesn't exist today. Treating this as "create + populate." Worth a one-line yes/no.
2. **`test:integration:prod` script naming.** The script runs against the deployed dev server (per the README and package.json), but is named `prod`. After this PR, it'll set `APP_ENV=dev` to match reality. Worth either (a) accepting the name as legacy and moving on, or (b) renaming to `test:integration:deployed` for clarity. Renaming is the cleaner call but expands scope.
3. **Should we rename the script as part of this ticket, or file a follow-up?** Tied to #2.

---

## Verdict

- **Story points:** 2–3. Surface is smaller than PAY-257 (~25 files), comparable to PAY-270 (~5 files). The extra Terraform + ADR + new `.env.example` push it slightly above PAY-270's 30-minute estimate. Realistic: ~1 hour of focused work plus the doc write-up.
- **Real risk:** the deployed-env `node_env` flip from `development` to `production`. Verified safe by the same analysis we did for PAY-257 (no code in this repo branches on `production` vs `development` at runtime — the storage client's old branch on `"development"` is exactly what we're replacing).
- **Net effect:** type-system enforcement of the rule going forward, storage-client bug fixed, README/`.env.example`/`running-locally.md` aligned, deployed-env config carried by `APP_ENV` instead of an overloaded `NODE_ENV`.
