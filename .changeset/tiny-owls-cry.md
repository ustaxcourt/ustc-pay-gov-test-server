---
"@ustaxcourt/ustc-pay-gov-test-server": minor
---

Adds support for mocking ACH failed payment responses using a token-based flow.

The pay page now shows a "Complete Payment (ACH - Failed)" link. Clicking it calls the `POST /pay/ACH/Failed?token={token}` endpoint, which marks the token with both `failed_payment` and `ach_initiated_at`.

After a token is marked as ACH Failed, `completeOnlineCollectionWithDetails` and `getDetails` return:

- `transaction_status` of `Received` for the first 60 seconds after initiation
- `transaction_status` of `Failed` after 60 seconds
- `payment_type` of `ACH` for both responses
