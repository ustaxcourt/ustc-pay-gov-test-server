# 4. Separate bootstrap Terraform stack for the GitHub OIDC deployer

Date: 2026-05-08

## Status

Accepted

## Context

The GitHub OIDC deployer role (`ustc-github-actions-oidc-deployer-role`) and
its inline policy were managed by the same Terraform configuration that uses
the deployer role to apply changes. This is a chicken-and-egg dependency: if
a deploy needs a new IAM permission (e.g., `logs:CreateLogGroup` for a
net-new Lambda), the deployer can't grant itself that permission, because it
doesn't have the permission yet.

A recent failed deployment surfaced this concretely: the deployer policy
omitted `logs:CreateLogGroup`, so any Lambda whose log group hadn't been
pre-created failed at apply time. There was no clean way to fix this from CI
itself.

## Decision

Manage the deployer role and its policy in a **separate Terraform stack**
located at `terraform/bootstrap/`, with these properties:

| Aspect | Choice |
|---|---|
| Location | Same repository, nested under `terraform/bootstrap/` |
| State | S3 bucket `ustc-pay-gov-terraform-state`, key `ustc-pay-gov-test-server/bootstrap.tfstate` (separate from app state) |
| Apply path | Manual, from a developer's workstation via `aws sso login` — never from CI |
| Cross-stack references | Constructed ARN patterns based on naming convention; **no** `terraform_remote_state` coupling |
| Access control | Standard PR review (no CODEOWNERS gate) — IAM changes are reviewed by convention with the platform reviewer |

The bootstrap stack manages exactly two AWS resources:
`aws_iam_role.github_actions_deployer` and
`aws_iam_role_policy.github_actions_permissions`. Everything else stays in
the app stack at `terraform/`.

## Consequences

- **Permission additions are explicit and human-reviewed.** Adding a new IAM
  action to the deployer is a code change to `terraform/bootstrap/main.tf`,
  reviewed in a normal PR, and applied manually. CI cannot self-grant
  permissions.
- **Drift risk on naming.** The bootstrap policy constructs app-resource
  ARNs from naming convention (`${project}-${env}-*`). If app naming
  changes, bootstrap policies must follow. Mitigation: the convention is
  small, well-known, and any mismatch surfaces as an explicit `AccessDenied`
  rather than silent corruption.
- **Two `terraform apply` paths.** Operators must know which stack they're
  in. Mitigated by the directory boundary, separate `backend.hcl`, and a
  README that specifies when to apply each.
- **Lower blast radius for the app deploy role.** A bad bootstrap apply
  affects only the deployer's permissions, not app-stack resources. The app
  stack is never at risk during a bootstrap change.

## Alternatives rejected

- **Single stack with `terraform_remote_state` between phases.** Would
  re-create the chicken-and-egg in a different shape (bootstrap depends on
  app being applied first). Rejected.
- **Separate repository for the bootstrap stack.** Cleaner ownership
  boundaries, but introduces cross-repo state coupling and discovery
  friction for a small team. Defer until a second service needs the same
  pattern.
- **Atlantis or Terraform Cloud.** Heavy infrastructure for a stack that
  changes ~quarterly. Manual local apply is appropriate for the cadence.
- **Make the deployer policy permissively broad** (`logs:*`, `iam:*`, etc.)
  to avoid future permission additions. Rejected on least-privilege
  grounds.

## References

- [terraform/bootstrap/](../../../terraform/bootstrap/) — the new stack
- [terraform/bootstrap/README.md](../../../terraform/bootstrap/README.md) —
  operator-facing apply instructions
