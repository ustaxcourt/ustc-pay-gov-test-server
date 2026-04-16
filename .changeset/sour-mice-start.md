---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

Fixes terraform apply never firing in the deploy workflow when terraform plan detected changes.

The root cause was two-fold: GitHub Actions runs shell scripts with `set -e` by default, which killed the script before the exit code from `terraform plan -detailed-exitcode` could be captured, and the `hashicorp/setup-terraform@v3` wrapper was swallowing terraform's exit code. The fix adds `set +e` around the plan command and disables the terraform wrapper (`terraform_wrapper: false`) in both `deploy.yml` and `pr-validate.yml`.

Also adds a "Check for plan failure" guard step in both workflows that fails the build when terraform plan returns an error (exit code 1), and a lint step in PR validation that verifies `set +e` is present before any `-detailed-exitcode` usage to prevent regression.
