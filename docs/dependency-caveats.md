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

## Baseline snapshot — 2026-07-08 (PAY-367)

Captured on branch `PAY-367-dependency-updates-2026-07-06`, off `main`.

- `npm audit`: **0 vulnerabilities**.
- `package.json` and `package-lock.json` already declare several **major** version
  bumps that were committed previously but whose install had not yet been verified
  by a full test run at the start of this ticket:

  | Package        | Installed (stale) | Declared / lockfile | Latest  |
  |----------------|-------------------|---------------------|---------|
  | express        | 4.22.1            | 5.2.1               | 5.2.1   |
  | typescript     | 5.9.3             | 6.0.3               | 7.0.2   |
  | jest           | 29.7.0            | 30.4.2              | 30.4.2  |
  | @types/express | 4.17.25           | 5.0.6               | 5.0.6   |
  | @types/jest    | 29.5.14           | 30.0.0              | 30.0.0  |
  | concurrently   | 9.2.1             | 10.0.3              | 10.0.3  |
  | esbuild        | 0.25.12           | 0.28.1              | 0.28.1  |

  Phase 1 of PAY-367 syncs the install (`npm ci`) and validates these against the
  full test/build suite before any further changes.

---

## Deferred upgrades

### typescript 6.x → 7.x — deferred (2026-07-08)

- **Current:** `^6.0.3` (declared). **Available latest:** `7.0.2`.
- **Reason:** TypeScript 7 is a full major ahead of the version this repo is
  currently migrating onto (6.x). Landing the 5→6 migration and proving the suite
  green is the goal of this ticket; stacking a second compiler major on top would
  conflate two migrations and expand blast radius.
- **Plan:** Evaluate 7.x in a dedicated follow-up once 6.x is stable on `main`.
  Cut a ticket and flag the PO if/when pursued.

<!-- Add further deferrals below as they are decided during PAY-367. -->

---

## Accepted vulnerabilities

_None at this time — `npm audit` reports 0 vulnerabilities as of 2026-07-08._

<!-- Format:
### <advisory-id> — <package>@<version> (<severity>)
- **Reason it can't be fixed now:** ...
- **Mitigation:** ...
- **Revisit:** <condition or date>
-->
