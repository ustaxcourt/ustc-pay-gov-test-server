---
"@ustaxcourt/ustc-pay-gov-test-server": minor
---

Improves reliability, security, and test coverage for Lambda, local Express routes, and deployment packaging.

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
