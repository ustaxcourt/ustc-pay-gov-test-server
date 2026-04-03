---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

Adds support for mocking failed credit-card payment responses using a token-based flow.

The new `POST /pay/fail?token={token}` endpoint marks that token as failed. After the token is marked failed, `completeOnlineCollectionWithDetails` and `getDetails` return `transaction_status` as `Failed` for that specific payment while keeping `payment_type` as `PLASTIC_CARD`.

Also adds integration coverage for the failed path, including duplicate failed-mark requests returning an error.
