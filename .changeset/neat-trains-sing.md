---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

Refactors ACH transaction status timing to use a single shared `ACH_THRESHOLD_SECONDS` constant set to `15`.

This replaces separate hardcoded timing values in ACH status resolution and keeps successful and failed ACH transitions consistent.

Also updates related test coverage to reference the shared constant.
