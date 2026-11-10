# Dependency Caveats

What is intentionally **not** on its latest version, which vulnerabilities are
accepted, and why. Required by the recurring dependency-update work (PAY-367 and
successors). Keep it to live decisions: per-pass detail belongs in the
changeset, and git history has the full write-ups of past entries.

---

## How to use this file

- **Deferred upgrade or accepted vulnerability:** add an entry below and a row
  to [Current status](#current-status). Give the reason, how reachable it is,
  and a revisit condition. If it needs its own ticket, cut it, notify the PO,
  and link it.
- **Resolved:** move it to [Removed](#removed) as one line with the date and
  why. Don't leave closed entries in the live sections.
- **Each pass:** add one line to [History](#history), re-check every revisit
  condition in Current status, and update its "Last checked" date.
- **Override or accept?** Override a vulnerable transitive package only when
  both hold: (a) a patched version exists and the parent's use of it was
  checked against that version, and (b) the code is reachable, or the finding
  is high/critical. Otherwise accept it here.
- **Dependabot:** fold runtime-dependency PRs into the weekly manual PR and
  close them with a link to it. The PR Validate `plan` job skips Dependabot
  branches, and a runtime bump changes the Lambda bundles, so merging one
  directly deploys a change nobody planned. Dismiss an alert as "vulnerable
  code is not actually used" only once that is confirmed.
- **Audit:** run `npm audit` and `npm audit --omit=dev` (what reaches
  consumers). The PR Validate `audit` job only fails on high/critical, so
  moderate and low findings still need an entry. A clean audit isn't proof;
  see [Lessons](#lessons).
- **A high/critical with no fix** fails the `audit` job on every PR. Look for
  a fix via `npm update` or an override first. If there's none and the code
  is unreachable, accept it here and change the job to read
  `npm audit --json` and fail only on high/critical IDs missing from an
  accepted-ID list. Every ID in that list needs an Accepted entry here;
  removing the entry means removing the ID.
- **Releases:** a merged fix doesn't reach consumers until the "Version
  Packages" PR is merged. When you flag the PO, say whether it's open and how
  many changesets it holds.

---

## Current status

| Item | Kind | Revisit when | Last checked |
| --- | --- | --- | --- |
| TypeScript 6 → 7 | Deferred | `ts-jest` accepts TypeScript 7 | 2026-11-10 |
| `babel-plugin-istanbul`, `test-exclude` | Override | Jest bumps them itself | 2026-11-10 |
| `glob` GHSA-3g3m-2fjr-6pw4 (moderate) | Accepted | Jest moves to `glob@^14` | 2026-11-10 |
| `minimatch` GHSA-g3hv-75wg-m249 (moderate) | Accepted | With `glob` | 2026-11-10 |
| `deepmerge` GHSA-gcqx-w48m-w2h4 (low) | Accepted | A fix ships, or `jest-config` drops it | 2026-11-10 |
| Node 24.22.1 on the Lambda runtime | Accepted, **follow-up pending** | Deployed `process.version` ≥ 24.22.1 | 2026-10-22 |

---

## Deferred upgrades

### TypeScript 6.x → 7.x (deferred 2026-09-17)

- **Current:** `^6.0.3`. **Latest:** `7.0.2`.
- **Why:** `ts-jest` (latest `29.4.15`) declares peer `typescript >=4.3 <7`,
  so TypeScript 7 would put the whole Jest suite on an unsupported pairing.
- **When unblocked:** this is a compiler major with a test-runner change, so
  it gets its own ticket. Cut it and flag the PO.

---

## Overrides in place

### `babel-plugin-istanbul@^8.0.2`, `test-exclude@^8.0.0` (since 2026-07-29)

- **Fixes:** GHSA-mh99-v99m-4gvg, `brace-expansion` (high), through
  `babel-plugin-istanbul` → `test-exclude` → `glob` → `minimatch`.
- **Why it's needed:** Jest still supports Node 18, so it holds these back;
  `test-exclude@8` needs Node ≥ 20, and we run 24.
- **Why both stay:** `babel-plugin-istanbul@8.0.2` asks for `test-exclude
  ^7.0.1`, which pulls `glob ^10`. `babel-plugin-istanbul`'s `latest`
  dist-tag is still `8.0.0`, so without the override npm resolves the older
  release. (The `glob` override was dropped 2026-10-21; Jest now asks for
  `^13.0.6` itself.)
- **Before removing:** re-run `npm audit` and check the tree has no nested
  vulnerable copies.

---

## Accepted vulnerabilities

### GHSA-3g3m-2fjr-6pw4 — glob@13.0.7 (moderate), accepted 2026-11-10

- **Advisory:** an `AbortSignal` doesn't stop a glob walk, so traversal
  continues after the caller's timeout. Fixed in `14.0.2`.
- **Chain (dev-only):** `@jest/reporters`, `jest-config`, `jest-runtime`, and
  `ts-jest` → `@jest/transform` → `babel-plugin-istanbul` → `test-exclude`.
  All ask for `^13.0.6`, so the only fix is a major override under Jest.
- **Not reachable:** none of those four callers passes a `signal` (checked with
  `grep -n signal` over their entry files, 2026-11-10), and their patterns come
  from repo config.

### GHSA-g3hv-75wg-m249 — minimatch@10.2.6 (moderate), accepted 2026-11-10

- **Advisory:** a crafted pattern can blow up brace expansion (DoS). Fixed in
  `11.0.1`.
- **Chain (dev-only):** `glob@13.0.7` and `test-exclude@8.0.0`, both on `^10`.
- **Not reachable:** the only patterns are Jest's `testMatch` and coverage
  globs from this repo's config.

### GHSA-gcqx-w48m-w2h4 — deepmerge@4.3.1 (low), accepted 2026-11-10

- **Advisory:** `mergeObject()` allows prototype poisoning. No fixed release.
- **Chain (dev-only):** `jest` → `@jest/core` → `jest-config`.
- **Not reachable:** it only merges Jest's defaults with this repo's Jest
  config.

### Node.js 24.22.1 — deployed Lambda runtime, accepted 2026-10-22

- **Advisories:** CVE-2026-105481 (http agent), -105482 (dns), -105483, -106069
  and -106072 (tls IP handling), -106073 (permission model), -106074 (crypto
  snapshots), -111497 (brotli). All fixed in Node `24.22.1`. `.nvmrc` already
  covers local dev and CI.
- **Why not fixable here:** the Lambdas run AWS-managed `nodejs24.x`
  (`terraform/variables.tf`, `lambda_runtime`) in automatic update mode, so
  AWS picks the patch version. Once AWS publishes a runtime, any function a
  deploy updates gets it straight away; the rest migrate later. A deploy only
  updates functions whose bundle changed (`source_code_hash`).
- **Exposure:** the http and tls fixes matter, because the Lambdas call S3 over
  Node's `https` agent through `@aws-sdk/client-s3`. The rest don't apply: no
  `fetch()`, WebSockets, permission model or snapshots.
- **Not taken:** a container image or custom runtime would let us pick the
  patch, but we'd own Node patching for good. That needs its own ticket.
- **Last reading:** `v24.21.0` on 2026-10-22, from a temporary version-check
  Lambda returning `process.version`. `INIT_START` runtime ARNs don't show the
  Node version.
- **Follow-up (PAY-507, 2026-11-10):** the 2026-11-05 checkpoint passed without
  a re-check, so this needs a ticket to evaluate pinning the runtime, and the
  PO notified.
  - **Status:** not opened yet.
  - **Ticket:** _key to be added_ · **Owner:** _to be added_
  - **Next step:** after the PAY-507 deploy, which updates every bundle,
    re-check `process.version`. Record it in the ticket and update this entry.

---

## Lessons

Things that cost time once. Check them on every pass.

- **A clean `npm audit` isn't proof the tree is patched.** The `body-parser`
  and `qs` advisories fixed on 2026-10-22 were only repository advisories, not
  yet in the GitHub Advisory Database that audit reads. Also check
  `npm outdated --all` and the GitHub advisories for production packages.
- **Run a full `npm update`, not just floor raises plus `npm install`.** The
  2026-10-21 pass missed an in-range `qs` fix that way.
- **`npm ci` on the `.nvmrc` Node is the real gate.** A lock generated with a
  different npm can pass `npm test` and fail `npm ci` in CI.
- **`engines` floor vs `.nvmrc`:** the `engines` floor must never sit above
  `.nvmrc`, or every CI install emits `EBADENGINE`. A security-only Node patch
  moves `.nvmrc` alone, so consumers aren't forced to upgrade.
- **dotenv 18's changelog says preloading was removed. It wasn't, for us.**
  `dotenv/config` (Jest `setupFiles`) and `DOTENV_CONFIG_PATH` both still work;
  18 only dropped the `./lib/cli-options` and `./lib/env-options` subpaths.
  Verified on 17.4.2 and 18.0.0.
- **Terraform CLI moves:** change both stacks' `required_version`, the two CI
  `terraform_version` pins and the two READMEs together. When 1.18 ships,
  check its changelog for breaking changes first.
- **Runtime bumps deploy:** `terraform/build.sh` bundles runtime dependencies
  into the Lambdas, so bumping one changes `source_code_hash`, and the deploy
  does a real apply.

---

## Removed

- **GHSA-hp3w-g68c-fv3c** `sprintf-js` (moderate): accepted 2026-10-14; GitHub
  withdrew the advisory 2026-10-22.
- **GHSA-rgw5-rvv9-x895** `brace-expansion` (high): resolved 2026-10-05 by
  removing the `nodemon` dependency.
- **`typescript` and `@types/*` in `dependencies`:** moved to `devDependencies`
  with `soap` on 2026-10-14 (PAY-494), once `start-pay-gov-test-server` stopped
  compiling at startup.

---

## History

One line per pass. See each pass's changeset and `CHANGELOG.md` for details.

- **Week of 2026-11-09 (PAY-507):** `follow-redirects` 1.16.3 (high, dev-only);
  runtime floors raised (`@aws-sdk/client-s3`, `dotenv`, `fast-xml-parser`);
  glob, minimatch and deepmerge accepted; `sprintf-js` removed; added the
  PR Validate `audit` job; split the Terraform concurrency group so PR plans
  can't cancel a deploy.
- **Week of 2026-10-26 (PAY-502):** AWS provider 6.70.0 → 6.72.0 in both
  locks; no npm changes.
- **Week of 2026-10-19 (PAY-499):** `body-parser` 2.4.0 (high) and `qs`
  6.16.1, both unreachable; dev-only `undici` 7.30.1; `.nvmrc` → 24.22.1;
  Terraform → 1.17; esbuild target → `node24`; `glob` override dropped.
- **Week of 2026-10-12 (PAY-494):** `handlebars` (3 critical) and
  `shell-quote` (critical) fixed, both dev-only; `sprintf-js` accepted.
- **Week of 2026-09-14:** no findings; `.nvmrc` → 24.20.0 and an explicit
  `engines` of `>=24.20.0 <25.0.0`.
