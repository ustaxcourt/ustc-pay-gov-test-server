# Dependency Caveats

This document records dependencies that are intentionally **not** on their latest
version, and vulnerabilities that could not be resolved, along with the reasoning.
It is a required artifact of the recurring dependency-update work (see PAY-367 and
successors).

When you defer an upgrade or accept a vulnerability, add a dated entry below with
enough context that the next person doesn't have to re-derive the decision.

---

## How to use this file

- **Deferred upgrade** → add an entry under [Deferred upgrades](#deferred-upgrades)
  with the package, current vs. available version, the reason for waiting, and a
  link to any follow-up ticket.
- **Accepted vulnerability** → add an entry under
  [Accepted vulnerabilities](#accepted-vulnerabilities) with the advisory ID,
  severity, why it can't be fixed now, and any mitigation.
- If an upgrade is involved enough to warrant its own ticket, cut the ticket,
  notify the PO, and reference it here.

---

## Deferred upgrades

### TypeScript 6.x → 7.x — deferred (2026-09-17)

- **Current:** `^6.0.3` (declared and resolved). **Available latest:** `7.0.2`.
- **Reason:** blocked by `ts-jest`, not by appetite. The latest `ts-jest`
  (`29.4.12`) declares `"typescript": ">=4.3 <7"` as a peer dependency, so
  moving to TypeScript 7 puts the whole Jest suite on an unsupported peer
  combination. `ts-jest` has published no release that accepts TypeScript 7.
- **History:** first deferred 2026-07-08 on the grounds that stacking a second
  compiler major on top of the in-flight 5→6 migration would conflate two
  migrations. That migration has since landed; the blocker is now the `ts-jest`
  peer range above, which is a harder constraint.
- **Plan:** re-check on each dependency-update pass whether `ts-jest` has
  widened its peer range. When it does, the upgrade warrants its own ticket —
  it is a compiler major with a test-runner change riding along, not routine
  maintenance. Cut the ticket and flag the PO at that point.

### dotenv 17.x → 18.x — taken, with a caveat for the Payment Portal (2026-09-18)

- **Upgraded** `^17.4.2` → `^18.0.0`. Recorded here because the changelog is
  misleading, not because the upgrade was deferred.
- **The trap:** dotenv 18's changelog lists "Remove preloading. Instead use cli
  `dotenv run -- your-command`". Read literally, that breaks this repo — Jest
  loads env through `setupFiles: ["dotenv/config"]`, and
  `test:integration:deployed` selects `.env.prod` via `DOTENV_CONFIG_PATH`.
- **What is actually true:** the `./config` subpath export survives in 18.0.0
  (`"./config": "./dist/config.cjs"`), and `DOTENV_CONFIG_PATH` is still
  honored. Verified empirically against both 17.4.2 and 18.0.0 — a plain
  `-r dotenv/config` preload and a `DOTENV_CONFIG_PATH=.env.prod` preload each
  resolved the expected file on both versions. What 18 dropped is the
  `./lib/cli-options` and `./lib/env-options` subpaths, which nothing here
  imports directly.
- **Payment Portal:** it declares `dotenv` separately and uses
  `node -r dotenv/config` in seven `package.json` scripts. The same finding
  should apply, but re-verify there before bumping — do not carry this
  conclusion across on trust.

<!-- Add further deferrals below as they are decided. -->

---

## Vulnerabilities

### Vulnerabilities resolved via override

Be cautious about doing overrides — reserve them for cases where the dependency is unlikely to fix the issue, or would take a long time to (e.g., a transitive dependency that isn't updated because it needs to support an old version of Node). If you do need an override, add the transitive dependency in question to `overrides` at the bottom of `package.json`.

### GHSA-mh99-v99m-4gvg — brace-expansion (<=5.0.7) (high) — resolved via override (2026-07-29)

**From: Jest**

- **Override:** `babel-plugin-istanbul@^8.0.2`, `test-exclude@^8.0.0`,
  `glob@^13.0.6`.
- **Why an override was needed:** `jest`'s own `babel-plugin-istanbul`/`glob`
  deps are held back because `glob@11+`/`test-exclude@8` require Node `>=20`,
  and jest 30 still officially supports Node `18.14.0+`. Not a bug on jest's
  part, just a Node-floor jest can't be forced to drop, but doesn't apply to
  us (`.nvmrc` pins `24.20.0`). That held-back chain
  (`babel-plugin-istanbul` → `test-exclude` → `glob` → `minimatch` →
  `brace-expansion`) is what `npm audit` flags.
- **Verified:** `npm audit` no longer reports the finding; `package-lock.json`
  shows a single deduped copy of each package at the overridden version
  (`babel-plugin-istanbul@8.0.2`, `test-exclude@8.0.0`, `glob@13.0.6`,
  `minimatch@10.2.6`, `brace-expansion@5.0.9`), with no vulnerable nested
  copies remaining.
- **Revisit:** once jest itself raises its Node floor past `20` and bumps
  these deps directly, this override can likely be dropped.

### GHSA-rgw5-rvv9-x895 — brace-expansion (4.0.0–5.0.8) (high) — resolved by transitive bump (2026-08-11)

**From: nodemon → minimatch**

- **Override:** none needed. The existing `glob@^13.0.6` override above already
  keeps this chain on `minimatch@10`, which declares
  `"brace-expansion": "^5.0.8"` — so `npm update` resolved straight to the
  patched `5.0.9` with no change to `package.json`.
- **Relationship to GHSA-mh99-v99m-4gvg:** supersedes it. That advisory covered
  `<=5.0.7` and was resolved by moving to `5.0.8`; this one covers `4.0.0–5.0.8`,
  which re-exposed that same pinned version. Both are now cleared by `5.0.9`.
- **Verified:** `npm audit` reports 0 vulnerabilities. `npm ls brace-expansion`
  shows a single deduped copy at `5.0.9` with one consumer
  (`nodemon@3.1.14` → `minimatch@10.2.6`). `brace-expansion@5.0.9` declares
  `engines: { node: "20 || >=22" }`, satisfied by the `24.20.0` pin in `.nvmrc`.
  Test suite green (19 suites / 131 tests).
- **Note:** this chain reaches production installs, because `nodemon` is declared
  in `dependencies` rather than `devDependencies`. Worth revisiting separately —
  moving `nodemon`, `typescript`, and the `@types/*` packages to
  `devDependencies` would shrink both the deployed footprint and the audit
  surface. Not changed here; flagged only so the next audit isn't dismissed as
  "dev-only."

### Week of 2026-09-14 — no new findings (2026-09-17)

`npm audit` reported **0 vulnerabilities** both before and after this round's
`npm update`. The three overrides recorded above (`babel-plugin-istanbul`, `test-exclude`,
`glob`) are still in `package.json` and still doing work — they are what keeps
the `brace-expansion` chain on a patched version. Do not drop them without
re-running `npm audit`.

Node floor raised this round: `.nvmrc` moved `24.19.0` → `24.20.0` (24.x LTS,
"Krypton") and `package.json` gained an explicit
`engines: { node: ">=24.20.0 <25.0.0" }`, which the package had never declared.
The two must move together — CI installs Node from `.nvmrc`, so an `engines`
floor above the `.nvmrc` pin would make every CI install emit `EBADENGINE`.
Note this floor reaches consumers of the published package: the Payment Portal
declares `>=24.19.0 <25.0.0` and depends on `^0.3.0`, so it needs the same bump
before it picks up this release.

Still open from the previous round, and deliberately not changed here:
`nodemon`, `typescript`, and the `@types/*` packages are declared in
`dependencies` rather than `devDependencies`, so they ship to production
installs and widen the audit surface. Moving them is a packaging change with
its own blast radius (it alters what consumers of the published package
receive), so it belongs in its own ticket rather than in a dependency refresh.

### Accepted vulnerabilities

<!-- Format:
### <advisory-id> — <package>@<version> (<severity>)

- **Reason it can't be fixed now:** ...
- **Mitigation:** ...
- **Revisit:** <condition or date>
-->
