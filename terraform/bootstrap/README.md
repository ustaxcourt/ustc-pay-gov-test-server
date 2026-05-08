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

## What this stack manages (and what it doesn't)

| Resource | Owner |
|---|---|
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
3. Open a PR. CODEOWNERS will route it to a platform reviewer.
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
