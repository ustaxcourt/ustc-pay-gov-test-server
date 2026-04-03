---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

Changes the generate paygov-token from 36 characters to 32 (stripping out the dashes) to match what Pay.gov docs say we should expect, as well as the results of running npm audit fix.
