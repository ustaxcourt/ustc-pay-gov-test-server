---
"@ustaxcourt/ustc-pay-gov-test-server": minor
---

Adds support for mocking ACH successful payment responses using a token-based flow.

The pay page now shows a "Complete Payment (ACH - Success)" link. Clicking it calls the generalized `POST /pay/:paymentMethod/:paymentStatus?token={token}` endpoint, which replaces the previous `POST /pay/fail` endpoint and handles all payment method and status combinations.

After a token is marked as ACH Success, `completeOnlineCollectionWithDetails` and `getDetails` return:

- `transaction_status` of `Received` for the first 15 seconds after initiation
- `transaction_status` of `Success` after 15 seconds
- `payment_type` of `ACH` for both responses
