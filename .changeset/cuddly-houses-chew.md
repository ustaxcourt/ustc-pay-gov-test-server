---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

Reject `completeOnlineCollection` and `completeOnlineCollectionWithDetails` requests that do not include `tcs_app_id`, matching Pay.gov behavior more closely.

Requests missing `tcs_app_id` now return an HTTP 400 response. The SOAP fault body includes return code `4019` and the message `No agency application found for given tcs_app_id.`
