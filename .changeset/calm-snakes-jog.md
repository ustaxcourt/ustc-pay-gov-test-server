---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

Adds support for mocking failed payment responses in `completeOnlineCollectionWithDetails` by honoring `transaction_status` on the request payload.

When `transaction_status` is set to `Failed`, the mock now persists and returns `Failed` for that transaction while keeping `payment_type` as `PLASTIC_CARD`.

Also adds integration test coverage for the failed path to verify both `completeOnlineCollectionWithDetails` and subsequent `getDetails` responses.
