---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

Move the GitHub OIDC deployer role and its inline policy into a separate
`terraform/bootstrap/` stack, applied manually with `aws sso login`. This
removes the chicken-and-egg where the deployer's permissions were managed by
the same Terraform state that uses the deployer to apply changes. Also adds
the missing `logs:CreateLogGroup` and related log-lifecycle permissions that
caused the recent net-new Lambda deployment to fail. No app behavior or
runtime contract changes.
