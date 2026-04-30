# @ustaxcourt/ustc-pay-gov-test-server

## 0.2.0

### Minor Changes

- 70cef0f: Adds support for mocking successful PayPal payment responses using a token-based flow.

  The pay page now shows a "Complete Payment (PAYPAL - Success)" link. Clicking it calls the `POST /pay/PAYPAL/Success?token={token}` endpoint, which marks the token as a PAYPAL payment.

  After a token is marked as PAYPAL Success, `completeOnlineCollectionWithDetails` and `getDetails` return:

  - `transaction_status` of `Success`
  - `payment_type` of `PAYPAL` for both responses

- 4ecc3d6: Adds support for mocking failed PayPal payment responses using a token-based flow.

  The pay page now shows a "Complete Payment (PAYPAL - Failed)" link. Clicking it calls the `POST /pay/PAYPAL/Failed?token={token}` endpoint, which marks the token with `paypal_initiated_at` and `failed_payment`.

  After a token is marked as PAYPAL Failed, `completeOnlineCollectionWithDetails` and `getDetails` return:

  - `transaction_status` of `Failed`
  - `payment_type` of `PAYPAL`

- b4251ff: Return 21-character alphanumeric paygov_tracking_id matching Pay.gov specification
- f44f2ac: Adds support for mocking ACH successful payment responses using a token-based flow.

  The pay page now shows a "Complete Payment (ACH - Success)" link. Clicking it calls the generalized `POST /pay/:paymentMethod/:paymentStatus?token={token}` endpoint, which replaces the previous `POST /pay/fail` endpoint and handles all payment method and status combinations.

  After a token is marked as ACH Success, `completeOnlineCollectionWithDetails` and `getDetails` return:

  - `transaction_status` of `Received` for the first 15 seconds after initiation
  - `transaction_status` of `Success` after 15 seconds
  - `payment_type` of `ACH` for both responses

- 1d07cb2: Improves reliability, security, and test coverage for Lambda, local Express routes, and deployment packaging.

  Key updates include:

  - Unified local and API Gateway error handling through shared helpers, with clearer behavior for 4xx vs 5xx responses.
  - Hardened local file reads against path traversal by validating resolved paths and rejecting parent/absolute traversal inputs.
  - Strengthened script-serving flow with strict filename validation and safer not-found mapping behavior.
  - Refactored script and payment-status handlers for better reuse and consistency between local and Lambda execution paths.
  - Updated mark-payment-status behavior and tests to align response content types and body formats across success and error scenarios.
  - Added new API Gateway endpoints for /pay/:method/:status endpoint and /scripts.
  - Migrated WSDL/static file handling to filesystem-backed sources and simplified Terraform Lambda packaging/deployment paths.
  - Expanded and stabilized unit/integration coverage, including BASE_URL handling and deterministic integration behavior in CI/local runs.
  - Enabled and aligned GitHub workflow test execution for the branch and follow-up test contract updates.

- 499453d: Adds support for mocking ACH failed payment responses using a token-based flow.

  The pay page now shows a "Complete Payment (ACH - Failed)" link. Clicking it calls the `POST /pay/ACH/Failed?token={token}` endpoint, which marks the token with both `failed_payment` and `ach_initiated_at`.

  After a token is marked as ACH Failed, `completeOnlineCollectionWithDetails` and `getDetails` return:

  - `transaction_status` of `Received` for the first 60 seconds after initiation
  - `transaction_status` of `Failed` after 60 seconds
  - `payment_type` of `ACH` for both responses

### Patch Changes

- d9d6667: Adds support for mocking failed credit-card payment responses using a token-based flow.

  The new `POST /pay/fail?token={token}` endpoint marks that token as failed. After the token is marked failed, `completeOnlineCollectionWithDetails` and `getDetails` return `transaction_status` as `Failed` for that specific payment while keeping `payment_type` as `PLASTIC_CARD`.

  Moves pay-page link override logic to an external script served from `GET /scripts/:file`, with token passed via query string.

  Also adds integration coverage for:

  - failed-payment flow, including duplicate failed-mark requests returning an error
  - script-serving endpoint behavior (`200` for known scripts, `404` for unknown scripts)
  - static asset parity between `src/static/html` and `terraform/static/html`, including an explicit `override-links.js` sync check

  Updates local testing documentation to clarify that the manual `POST /pay/fail?token={token}` curl step is optional when the failed-payment link on the pay page has already been clicked.

- ca38767: Reject `completeOnlineCollection` and `completeOnlineCollectionWithDetails` requests that do not include `tcs_app_id`, matching Pay.gov behavior more closely.

  Requests missing `tcs_app_id` now return an HTTP 400 response. The SOAP fault body includes return code `4019` and the message `No agency application found for given tcs_app_id.`

- 1d855d6: Refactors ACH transaction status timing to use a single shared `ACH_THRESHOLD_SECONDS` constant set to `15`.

  This replaces separate hardcoded timing values in ACH status resolution and keeps successful and failed ACH transitions consistent.

  Specifically, the ACH-failed `Received` window now changes from 60 seconds to 15 seconds to match `ACH_THRESHOLD_SECONDS`.

- 3ba9e66: Changes the generate paygov-token from 36 characters to 32 (stripping out the dashes) to match what Pay.gov docs say we should expect, as well as the results of running npm audit fix.
- 5d89dfc: Fixes terraform apply never firing in the deploy workflow when terraform plan detected changes.

  The root cause was two-fold: GitHub Actions runs shell scripts with `set -e` by default, which killed the script before the exit code from `terraform plan -detailed-exitcode` could be captured, and the `hashicorp/setup-terraform@v3` wrapper was swallowing terraform's exit code. The fix adds `set +e` around the plan command and disables the terraform wrapper (`terraform_wrapper: false`) in both `deploy.yml` and `pr-validate.yml`.

  Also adds a "Check for plan failure" guard step in both workflows that fails the build when terraform plan returns an error (exit code 1), and a lint step in PR validation that verifies `set +e` is present before any `-detailed-exitcode` usage to prevent regression.

- 955ea35: Adds running-locally documentation for faster developer setup, and patch and version updates on package.json

## 0.1.1

### Patch Changes

- c0c73cf: Added further documentations for the changesets publishing workflow
- 9704589: Updated token used by changesets to be a personal access token
- fa47179: Moved dev dependencies to normal dependencies to fix issues running test server after installing from npm

## 0.1.0

### Minor Changes

- b70cacb: Updated repo to have it be published to npm. Created script to allow local server to be run after being installed into node_modules.
