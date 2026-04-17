---
"@ustaxcourt/ustc-pay-gov-test-server": minor
---

Adds support for mocking failed PayPal payment responses using a token-based flow.

The pay page now shows a "Complete Payment (PAYPAL - Failed)" link. Clicking it calls the `POST /pay/PAYPAL/Failed?token={token}` endpoint, which marks the token with `paypal_initiated_at` and `failed_payment`.

After a token is marked as PAYPAL Failed, `completeOnlineCollectionWithDetails` and `getDetails` return:

- `transaction_status` of `Failed`
- `payment_type` of `PAYPAL`
