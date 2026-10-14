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
- **Override or accept?** For a vulnerable transitive package the direct
  dependency won't bump, add an override only when both hold: (a) a patched
  version exists and the parent's use of it has been checked against that
  version, and (b) the vulnerable code is reachable, or the finding is high or
  critical. Otherwise accept it with a reachability note, and dismiss the
  GitHub Dependabot alert as "vulnerable code is not actually used".

---

## Deferred upgrades

### TypeScript 6.x → 7.x — deferred (2026-09-17, re-checked 2026-10-14)

- **Current:** `^6.0.3` (declared and resolved). **Available latest:** `7.0.2`.
- **Reason:** blocked by `ts-jest`, not by appetite. The latest `ts-jest`
  (`29.4.14`) declares `"typescript": ">=4.3 <7"` as a peer dependency, so
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

### Terraform 1.16.x → 1.17 — not released (2026-10-14)

- **Current:** `required_version = "~> 1.16.0"` in both stacks, and
  `terraform_version: ~1.16.0` in `deploy.yml` and `pr-validate.yml`.
- **Reason:** there is no 1.17 release yet. The latest is `1.16.6`, which both
  constraints already pick up, so nothing needs to change.
- **Plan:** when 1.17 ships, move `required_version` and both workflow pins
  together, as was done for 1.15 → 1.16.

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

### GHSA-rgw5-rvv9-x895 — brace-expansion (4.0.0–5.0.8) (high) — resolved by removing the nodemon dependency (2026-10-05)

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
`typescript` and the `@types/*` packages are declared in
`dependencies` rather than `devDependencies`, so they ship to production
installs and widen the audit surface. Moving them is a packaging change with
its own blast radius (it alters what consumers of the published package
receive), so it belongs in its own ticket rather than in a dependency refresh.

### Week of 2026-10-12 — 23 findings → 1 accepted (2026-10-14)

`npm audit` went from 23 findings (3 critical, 20 moderate) to 20 moderate rows,
all from the single `sprintf-js` advisory accepted below. Every finding was in
dev-only tooling.

- `handlebars` GHSA-xw65-4hp5-5hc7, GHSA-8r5x-fm3f-whwj, GHSA-p8wg-vrv2-v86f
  (critical): fixed by `npm update` to `4.7.10` (via `ts-jest`).
- `shell-quote` GHSA-pqg4-j6r4-53mv (critical): fixed by moving the exact pin
  on `concurrently` from `10.0.5` to `10.0.6`. That gives a single deduped
  `shell-quote@1.12.0`, shared with `@changesets/cli` → `launch-editor`.

### Accepted vulnerabilities

### GHSA-hp3w-g68c-fv3c — sprintf-js@1.0.3 (moderate) — accepted (2026-10-14)

- **Chain:** `ts-jest` → `@jest/transform` → `babel-plugin-istanbul` →
  `@istanbuljs/load-nyc-config@1.1.0` → `js-yaml@3.15.2` → `argparse@1.0.10`
  → `sprintf-js@1.0.3`. `npm audit` reports it as 20 moderate rows because it
  also lists every parent.
- **Reason it can't be fixed now:** the advisory covers every release
  (`<=1.1.3`, and `1.1.3` is the latest), so there is no patched version to
  move to.
- **Why it isn't reachable:** `js-yaml@3` only requires `argparse` from its
  `bin/js-yaml.js` CLI, never from the library code `load-nyc-config` calls
  (`require('js-yaml').load(...)`, and only for a `.nycrc.yaml`, which this repo
  doesn't have). Dev-only; nothing here ships to consumers.
- **Not overridden:** overriding `js-yaml` to `^4` (whose `argparse@2` has no
  `sprintf-js`) would clear it, but fails the override rule above. The Payment
  Portal removed exactly that override for the same reason and noted
  "do not re-add" in its own `docs/dependency-caveats.md`.
- **Revisit:** when `sprintf-js` publishes a fix, or `@istanbuljs/load-nyc-config`
  moves off `js-yaml@3`.

<!-- Format:
### <advisory-id> — <package>@<version> (<severity>)

- **Reason it can't be fixed now:** ...
- **Mitigation:** ...
- **Revisit:** <condition or date>
-->
