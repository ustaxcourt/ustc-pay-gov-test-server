---
"@ustaxcourt/ustc-pay-gov-test-server": minor
---

Local development no longer requires an access token.

When `APP_ENV=local`, the server skips the `Authentication: Bearer ...` check,
so requests to a locally running instance need no header and no `ACCESS_TOKEN`
is required to set one up. The `start-pay-gov-test-server` script no longer
prompts for a token, and now writes `BASE_URL` to the generated `.env` — without
it the served WSDL rendered its schema imports as `undefined/wsdl/...`.

Also fixes a pre-existing authentication bypass: when `ACCESS_TOKEN` was unset,
the expected value interpolated to the literal string `Bearer undefined`, so a
client sending that exact header authenticated successfully. A missing or empty
token now rejects every request.

Deployed environments are unaffected and continue to authenticate every request.
The bypass is gated on `APP_ENV` rather than on a missing `ACCESS_TOKEN`, so a
secret that fails to load rejects requests instead of accepting them, and
Terraform now refuses to deploy with `app_env = "local"`.
