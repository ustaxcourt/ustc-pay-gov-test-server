# Bootstrap Stack — GitHub OIDC Deployer

This directory manages the IAM resources that the **app stack's** CI/CD relies
on to deploy. Specifically: the GitHub OIDC deployer role
(`ustc-github-actions-oidc-deployer-role`) and its inline policy.

It exists as a separate Terraform stack because of the chicken-and-egg
problem: if the role's permissions are managed by the same Terraform that
uses the role to apply changes, you can't add a new permission without
already having that permission. See
[doc/PAY-303-plan.md](../../doc/PAY-303-plan.md) for the full rationale.

## When to apply

Apply the bootstrap stack in these (rare) situations:

1. **A deploy failed because the deployer is missing an IAM permission.**
   This is the recurring case. Add the missing action to `main.tf`, get the
   PR reviewed, and apply from your workstation.
2. **The OIDC trust policy needs to change** (e.g., adding a new branch
   pattern, new repo allowed to assume the role).
3. **First-time setup of a new environment.**

The bootstrap stack does **not** run in CI. CI uses the deployer role itself,
so applying bootstrap from CI would defeat the purpose.

## How to apply

### Prerequisites

- `aws sso login` to a profile in account `803663093283` with permission to
  manage IAM (at minimum: `iam:CreateRole`, `iam:UpdateAssumeRolePolicy`,
  `iam:PutRolePolicy`, `iam:GetRole*`).
- `terraform` >= 1.14 on PATH.

### One-time init

```bash
cd terraform/bootstrap
terraform init -backend-config=backend.hcl
```

### Plan, then apply

```bash
terraform plan
terraform apply
```

Always read the plan before applying. Specifically watch for any
`# aws_iam_role.github_actions_deployer` resource being **recreated** — that
means the role would be destroyed and re-created with a new ARN, breaking
the GitHub Actions secret. If you see that, **stop**: it indicates either
state drift or an ARN mismatch. Investigate before continuing.

## First-time bring-up (PAY-303 cutover)

The role and policy already exist in AWS today, managed by the **app stack**
at `terraform/`. Before the very first `apply` from this directory, you must
transfer ownership: remove the resources from the app state, then import
them into the bootstrap state. Skipping this step makes `terraform apply`
try to *create* a role that already exists, which fails with
`EntityAlreadyExists`.

This procedure runs once per environment, from the feature branch where
`terraform/iam-oidc-github.tf` has already been deleted. Coordinate with the
team to freeze merges to `main` for the duration (≈ 30 minutes), since
`deploy.yml` runs `terraform apply` on every push to `main`.

```bash
# 1. Confirm the right account
aws sts get-caller-identity   # MUST show account 803663093283

# 2. Remove from app state (does NOT touch AWS)
cd terraform
terraform init -backend-config=backend-dev.hcl
terraform state list | grep -E 'github_actions_(deployer|permissions)'   # expect 2 lines
terraform state rm aws_iam_role.github_actions_deployer
terraform state rm aws_iam_role_policy.github_actions_permissions
terraform plan -input=false   # MUST show no OIDC-related diffs

# 3. Import into bootstrap state
cd bootstrap
terraform init -backend-config=backend.hcl
terraform import aws_iam_role.github_actions_deployer ustc-github-actions-oidc-deployer-role
terraform import aws_iam_role_policy.github_actions_permissions \
  ustc-github-actions-oidc-deployer-role:ustc-pay-gov-test-server-dev-ci-deployer

# 4. Verify the diff is policy-only
terraform plan
# Expected: ONLY the new logs:* permissions added. The role itself must show
# no changes. If the role appears in the diff, STOP and investigate.

# 5. Apply
terraform apply

# 6. Validate in AWS
aws iam get-role --role-name ustc-github-actions-oidc-deployer-role --query 'Role.Arn'
aws iam get-role-policy \
  --role-name ustc-github-actions-oidc-deployer-role \
  --policy-name ustc-pay-gov-test-server-dev-ci-deployer \
  --query 'PolicyDocument.Statement[?contains(Action, `logs:CreateLogGroup`)]'
# Second command must return a non-empty result.
```

After this completes, lift the merge freeze and merge the PR. Subsequent
applies follow the normal "Plan, then apply" section above.

## What this stack manages (and what it doesn't)

| Resource | Owner |
| --- | --- |
| `aws_iam_role.github_actions_deployer` | Bootstrap |
| `aws_iam_role_policy.github_actions_permissions` | Bootstrap |
| Lambda functions, exec role, S3 bucket, API Gateway, etc. | App stack (`terraform/`) |
| Terraform state S3 bucket | Manual ([create-terraform-backend.sh](../create-terraform-backend.sh)) |
| GitHub OIDC provider | Pre-existing in account (referenced via `github_oidc_provider_arn`) |

The bootstrap stack does **not** read app-stack state. All cross-stack
references in the deployer policy use constructed ARN patterns based on the
naming convention (`${project_name}-${environment}-*`). If app naming
changes, bootstrap policies must be updated to match — see `locals.tf`.

## Adding a new permission

The recurring task this stack exists for. Workflow:

1. Identify the missing IAM action from the `AccessDenied` in the failed
   deploy log.
2. Add the action to the appropriate `Statement` block in `main.tf`. Scope
   it to the narrowest reasonable resource pattern (use the `local.*_arn_pattern` helpers).
3. Open a PR and request review from the platform reviewer for IAM changes.
4. After merge, run `terraform plan` and `terraform apply` from your
   workstation.
5. Re-run the previously-failed deploy. It should now succeed.

## State

- **Backend:** S3, bucket `ustc-pay-gov-terraform-state`, key
  `ustc-pay-gov-test-server/bootstrap.tfstate`.
- **Locking:** S3 native (`use_lockfile = true`).
- **Separate from app state** — by design. App state lives at the same
  bucket under key `ustc-pay-gov-test-server/terraform.tfstate`.

## See also

- [doc/PAY-303-plan.md](../../doc/PAY-303-plan.md) — full implementation plan
  and rationale.
- [../iam-oidc-github.tf](../iam-oidc-github.tf) — the original (deleted
  after Phase 4 of PAY-303).
