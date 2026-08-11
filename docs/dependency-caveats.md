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

### TypeScript 6.x → 7.x — deferred (2026-07-08)

- **Current:** `^6.0.3` (declared). **Available latest:** `7.0.2`.
- **Reason:** TypeScript 7 is a full major ahead of the version this repo is
  currently migrating onto (6.x). Landing the 5→6 migration and proving the suite
  green is the goal of this ticket; stacking a second compiler major on top would
  conflate two migrations and expand blast radius.
- **Plan:** Evaluate 7.x in a dedicated follow-up once 6.x is stable on `main`.
  Cut a ticket and flag the PO if/when pursued.

### @changesets/cli 2.x → 3.x — deferred (2026-08-11)

- **Current:** `^2.31.1` (declared). **Available latest:** `3.0.0`.
- **Reason:** A major on the tool that drives release tooling — `ci:publish`
  runs `changeset publish`, and the `publish.yml` workflow depends on it. A
  regression here breaks publishing rather than the app, so it shouldn't ride
  along with a routine weekly dependency sweep where it would get little
  focused testing.
- **Plan:** Upgrade in its own PR, where the changeset → version → publish flow
  can be exercised end to end before merge.

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
  us (`.nvmrc` pins `24.19.0`). That held-back chain
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
  `engines: { node: "20 || >=22" }`, satisfied by the `24.19.0` pin in `.nvmrc`.
  Test suite green (19 suites / 131 tests).
- **Note:** this chain reaches production installs, because `nodemon` is declared
  in `dependencies` rather than `devDependencies`. Worth revisiting separately —
  moving `nodemon`, `typescript`, and the `@types/*` packages to
  `devDependencies` would shrink both the deployed footprint and the audit
  surface. Not changed here; flagged only so the next audit isn't dismissed as
  "dev-only."

### Accepted vulnerabilities
<!-- Format:
### <advisory-id> — <package>@<version> (<severity>)

- **Reason it can't be fixed now:** ...
- **Mitigation:** ...
- **Revisit:** <condition or date>
-->

