---
"@ustaxcourt/ustc-pay-gov-test-server": minor
---

Adds support for mocking successful PayPal payment responses using a token-based flow.

The pay page now shows a "Complete Payment (PAYPAL - Success)" link. Clicking it calls the `POST /pay/PAYPAL/Success?token={token}` endpoint, which marks the token with `paypal_initiated_at`.

After a token is marked as PAYPAL Success, `completeOnlineCollectionWithDetails` and `getDetails` return:

- `transaction_status` of `Received` for the first 15 seconds after initiation
- `transaction_status` of `Success` after 15 seconds
- `payment_type` of `PAYPAL` for both responses
