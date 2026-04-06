---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

Adds support for mocking failed credit-card payment responses using a token-based flow.

The new `POST /pay/fail?token={token}` endpoint marks that token as failed. After the token is marked failed, `completeOnlineCollectionWithDetails` and `getDetails` return `transaction_status` as `Failed` for that specific payment while keeping `payment_type` as `PLASTIC_CARD`.

Moves pay-page link override logic to an external script served from `GET /scripts/:file`, with token passed via query string.

Also adds integration coverage for:

- failed-payment flow, including duplicate failed-mark requests returning an error
- script-serving endpoint behavior (`200` for known scripts, `404` for unknown scripts)
- static asset parity between `src/static/html` and `terraform/static/html`, including an explicit `override-links.js` sync check

Updates local testing documentation to clarify that the manual `POST /pay/fail?token={token}` curl step is optional when the failed-payment link on the pay page has already been clicked.
