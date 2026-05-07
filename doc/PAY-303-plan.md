# PAY-303 — Separate CICD Deployer Terraform from App Infrastructure: Implementation Plan

## Goal

Resolve the chicken-and-egg problem where the GitHub OIDC deployer role's IAM
permissions are managed by the same Terraform state that uses the deployer
role to apply changes. After this work, deployer permissions can be granted
(via manual local apply with elevated credentials) **before** the app deploy
that needs them, and we also add the missing `logs:CreateLogGroup` permission
that triggered the recent failed deployment.

## Acceptance Criteria (rewritten)

The original AC was right in spirit but underspecified four things that would
have been re-litigated mid-PR. Replace it with:

1. Bootstrap Terraform config lives in `terraform/bootstrap/` with its own
   state backend (separate S3 key from the app state) and is documented in
   `terraform/bootstrap/README.md`.
2. The OIDC deployer role and all of its policies are managed by the bootstrap
   config; **no** OIDC deployer resources remain in `terraform/*.tf`.
3. Existing OIDC resources are migrated via `terraform state mv` (or import) —
   the role is **not** destroyed and recreated. Role ARN does not change.
4. Bootstrap can be applied locally via `aws sso login` with documented IAM
   permissions required to apply.
5. App Terraform references the deployer role by name (or constructed ARN) only
   where strictly necessary — no `data "aws_iam_role"` lookups that would
   re-couple the stacks.
6. Deployer policy grants `logs:CreateLogGroup`, `logs:PutRetentionPolicy`, and
   the related log-group lifecycle actions needed to deploy a net-new Lambda
   from a clean account.
7. Repo-level `CODEOWNERS` requires platform-reviewer approval for changes to
   `terraform/bootstrap/**`.
8. PR description includes a cutover runbook documenting the order of:
   (a) apply bootstrap from local with elevated creds,
   (b) merge the PR that removes OIDC resources from app state,
   (c) confirm next deploy succeeds.


## Guiding principles

1. **Two stacks, one repo.** Same repository (lower discovery friction, fewer
   moving parts), but two independent Terraform states. CODEOWNERS provides
   security separation.
2. **Bootstrap stack is rarely applied, manually.** Anyone with platform-tier
   AWS access can `terraform apply` from their workstation with `aws sso
   login`. CI does **not** apply the bootstrap stack — that would defeat the
   purpose.
3. **No remote-state coupling between the stacks.** Don't pull one stack's
   state into the other via `terraform_remote_state` — that re-creates the
   chicken-and-egg in a new shape. Both stacks construct ARNs from the
   shared naming convention (`${project}-${env}-*` plus region + account-id).
4. **Move, don't recreate.** The `aws_iam_role.github_actions_deployer`
   resource already exists in AWS and is in active use. `terraform state mv`
   between states preserves the role; recreating would change the ARN
   (sometimes) and definitely cause a window of broken auth.
5. **Fix the original bug as part of the migration.** Adding the missing
   `logs:CreateLogGroup` permission is the test that proves the new structure
   works — apply bootstrap, then deploy a change that adds a new Lambda, and
   the deploy should succeed.

## Current state — inventory

Files in `terraform/` that participate in OIDC deployer management today:

| File | Lines | What it does |
|---|---|---|
| [`terraform/iam-oidc-github.tf`](../terraform/iam-oidc-github.tf) | 144 | Defines `aws_iam_role.github_actions_deployer` and `aws_iam_role_policy.github_actions_permissions`. The whole file. |
| [`terraform/locals.tf:6-8`](../terraform/locals.tf#L6-L8) | 3 | `github_oidc_provider_arn`, `deploy_role_name`, `github_repo` locals — referenced by `iam-oidc-github.tf`. |
| [`terraform/variables.tf`](../terraform/variables.tf) | (multiple) | `github_org`, `github_repo`, `github_ref`, `deploy_role_name`, `github_oidc_provider_arn` variables. |
| [`terraform/main.tf:22`](../terraform/main.tf#L22) | 1 | `data.aws_caller_identity.current` — referenced by deployer policy for ARN construction. |

Cross-references inside `iam-oidc-github.tf` that block a clean cut:

| Line | Reference | Resolution strategy |
|---|---|---|
| 64 | `aws_iam_role.lambda_execution_role.arn` | Replace with constructed ARN: `arn:aws:iam::${account_id}:role/${project}-${env}-lambda-role` (matches naming in [`iam.tf:3`](../terraform/iam.tf#L3)). |
| 65, 72 | `aws_iam_role.lambda_execution_role.arn` (PassRole + GetRole) | Same as above. |
| 97, 102 | `module.s3.bucket_arn` | Replace with `arn:aws:s3:::${env}-${project}` (matches naming in [`locals.tf:18`](../terraform/locals.tf#L18)). |
| 113 | `aws_secretsmanager_secret.access_token.arn` | Replace with name pattern: `arn:aws:secretsmanager:${region}:${account_id}:secret:ustc/pay-gov/${env}/access-token-*`. |
| 121-122 | `local.tf_state_bucket_name` | Move local to bootstrap stack; both stacks need it but as a string, not a resource reference. |

**The bug to fix as part of this migration:** the existing policy grants only
`logs:DescribeLogGroups` and `logs:ListTagsForResource` for CloudWatch Logs.
Missing actions that the recent failed deployment needed:

- `logs:CreateLogGroup`
- `logs:DeleteLogGroup`
- `logs:PutRetentionPolicy`
- `logs:TagResource` / `logs:UntagResource`
- `logs:DescribeLogStreams` (for log-stream-aware tools)

Scope these to:
`arn:aws:logs:${region}:${account_id}:log-group:/aws/lambda/${project}-${env}-*`.

## Target structure

```
terraform/
├── bootstrap/                          # ← new stack
│   ├── README.md                       # how to apply, who can apply, when
│   ├── backend.hcl                     # separate S3 key
│   ├── main.tf                         # provider + role + policies
│   ├── locals.tf                       # naming convention shared via vars
│   ├── variables.tf
│   ├── outputs.tf                      # exports role_arn, role_name
│   ├── versions.tf
│   └── terraform.tfvars.template
├── (existing app stack — minus iam-oidc-github.tf)
├── ...
└── README.md                           # add a "Bootstrap" section linking to bootstrap/
```

State layout (S3 bucket `ustc-pay-gov-terraform-state`):

| Stack | Key |
|---|---|
| App (existing) | `ustc-pay-gov-test-server/terraform.tfstate` |
| Bootstrap (new) | `ustc-pay-gov-test-server/bootstrap.tfstate` |

Same bucket, different keys. The bucket itself is created by
`terraform/create-terraform-backend.sh` (already a manual bootstrap step) — no
new infrastructure needed.

## Implementation phases

### Phase 0 — pre-work (no code changes)

- Confirm the AWS account-id and account access model: who can run `aws sso
  login` and assume a role with `iam:CreateRole`, `iam:PutRolePolicy`?
  Document in `terraform/bootstrap/README.md` (Phase 5).
- Confirm naming-convention stability: are all OIDC-policy-relevant resources
  named `${project}-${environment}-*`? (Spot check: lambda role on
  [`iam.tf:3`](../terraform/iam.tf#L3) ✓, S3 bucket on
  [`locals.tf:18`](../terraform/locals.tf#L18) uses `${env}-${project}`
  (different order) — bootstrap policy must match this exactly.)

### Phase 1 — scaffold `terraform/bootstrap/`

Create the new directory with all files but **don't apply yet**. Files:

**`terraform/bootstrap/main.tf`:**

```hcl
terraform {
  backend "s3" {
    # Backend config provided via -backend-config=backend.hcl
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform-bootstrap"
    }
  }
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role" "github_actions_deployer" {
  name = var.deploy_role_name
  # ... (copied from terraform/iam-oidc-github.tf:5-29 verbatim)
}

resource "aws_iam_role_policy" "github_actions_permissions" {
  name = "${var.project_name}-${var.environment}-ci-deployer"
  role = aws_iam_role.github_actions_deployer.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # ... policies, but with cross-references replaced by constructed ARNs
      # AND the new logs permissions added
    ]
  })
}
```

**`terraform/bootstrap/locals.tf`:**

```hcl
locals {
  account_id = data.aws_caller_identity.current.account_id

  lambda_function_arn_pattern = "arn:aws:lambda:${var.aws_region}:${local.account_id}:function:${var.project_name}-${var.environment}-*"
  lambda_role_arn             = "arn:aws:iam::${local.account_id}:role/${var.project_name}-${var.environment}-lambda-role"
  s3_bucket_arn               = "arn:aws:s3:::${var.environment}-${var.project_name}"
  log_group_arn_pattern       = "arn:aws:logs:${var.aws_region}:${local.account_id}:log-group:/aws/lambda/${var.project_name}-${var.environment}-*"
  access_token_secret_arn_pattern = "arn:aws:secretsmanager:${var.aws_region}:${local.account_id}:secret:ustc/pay-gov/${var.environment}/access-token-*"
}
```

**`terraform/bootstrap/backend.hcl`:**

```hcl
bucket       = "ustc-pay-gov-terraform-state"
key          = "ustc-pay-gov-test-server/bootstrap.tfstate"
region       = "us-east-1"
encrypt      = true
use_lockfile = true
```

**`terraform/bootstrap/variables.tf`:** mirror the variables actually used by
`iam-oidc-github.tf` today (`project_name`, `environment`, `aws_region`,
`deploy_role_name`, `github_org`, `github_repo`, `github_oidc_provider_arn`).

**`terraform/bootstrap/outputs.tf`:**

```hcl
output "deployer_role_arn" {
  value = aws_iam_role.github_actions_deployer.arn
}

output "deployer_role_name" {
  value = aws_iam_role.github_actions_deployer.name
}
```

These outputs exist for documentation/inspection — the app stack does not read
them.

### Phase 2 — initialize bootstrap state and import existing role

```bash
cd terraform/bootstrap
terraform init -backend-config=backend.hcl
terraform import -var-file=terraform.tfvars aws_iam_role.github_actions_deployer ustc-github-actions-oidc-deployer-role
terraform import -var-file=terraform.tfvars aws_iam_role_policy.github_actions_permissions ustc-github-actions-oidc-deployer-role:ustc-pay-gov-test-server-dev-ci-deployer
terraform plan
```

The plan output should show **only** the diff between the imported policy and
the new policy (i.e., the added log permissions). If it shows the role itself
being recreated, stop — the role-import didn't take.

### Phase 3 — apply bootstrap, validate

```bash
terraform apply
```

Validate manually:

```bash
aws iam get-role-policy \
  --role-name ustc-github-actions-oidc-deployer-role \
  --policy-name ustc-pay-gov-test-server-dev-ci-deployer \
  --query 'PolicyDocument.Statement[?contains(Action, `logs:CreateLogGroup`)]'
```

Expected: a non-empty result, scoped to the lambda log-group ARN pattern.

### Phase 4 — remove OIDC resources from app state

Now that the bootstrap state owns the role, the app state still has its own
copy. Two sub-steps:

**4a. Remove from app state (without destroying the resource):**

```bash
cd terraform
terraform init -backend-config=backend-dev.hcl
terraform state rm aws_iam_role.github_actions_deployer
terraform state rm aws_iam_role_policy.github_actions_permissions
```

**4b. Delete `terraform/iam-oidc-github.tf`** and remove now-unused locals
from [`locals.tf:6-8`](../terraform/locals.tf#L6-L8).

**4c. `terraform plan`** in the app stack — should show **no** changes
(neither create nor destroy). If it shows a destroy of the role, **stop**:
the state-rm didn't take, and applying would delete the role.

### Phase 5 — documentation

Create `terraform/bootstrap/README.md` covering:

- **Purpose.** Why this stack exists (chicken-and-egg, link to ADR if one is
  written).
- **Who can apply.** AWS permissions required (rough: `iam:*` on the deployer
  role, `s3:*` on the state bucket key).
- **How to apply.** `aws sso login`, then `terraform init`, `terraform plan`,
  `terraform apply` from `terraform/bootstrap/`.
- **When to apply.** Three triggers:
  1. Adding a new AWS resource type to the app stack that requires new
     deployer permissions (the recurring case — what this plan was written
     to handle cleanly).
  2. Rotating the OIDC trust policy (rare).
  3. First-time setup of a new environment.
- **The runbook for "next failed deploy due to missing permissions."**
  Step-by-step: identify the missing IAM action, add it to bootstrap policy,
  apply bootstrap, retry app deploy.

Update `terraform/README.md` to add a "Bootstrap" section linking to the
above.

### Phase 6 — CODEOWNERS

Add to repo `.github/CODEOWNERS` (create if it doesn't exist):

```
/terraform/bootstrap/    @<platform-reviewer-handle>
```

Confirms with a maintainer who that handle should be (likely Anurag based on
the AC's call-out, plus another reviewer for redundancy).

## Cutover plan (PR description verbatim)

The PR for this work will be a single PR that contains the new `bootstrap/`
directory, the deletion of `iam-oidc-github.tf`, and the doc/CODEOWNERS
updates. The cutover order is:

1. **Before merging the PR:** apply the bootstrap stack from a developer's
   workstation (Phases 2–3 above). At this point the role exists in two
   states (app + bootstrap), but only one Terraform tree is applying it
   between runs, so this is a quiescent period.
2. **Merge the PR.** The next CI run will not apply Terraform yet (or, if it
   does, it'll see no diff because the OIDC resources are gone from the file
   tree and from app state).
3. **Run `terraform state rm`** on the app state to clean up the now-orphaned
   entries (Phase 4a). Confirm `terraform plan` is clean.
4. **Test the fix.** Open a follow-up PR that adds a trivial new Lambda or
   triggers log-group creation. The CI deploy should succeed where it
   previously failed.

## Rollback plan

If the bootstrap apply goes wrong:

- **If the role got recreated** (different ARN): the GitHub Actions secret
  `DEV_AWS_DEPLOYER_ROLE_ARN` needs to be rotated to the new ARN. Until
  then, deploys will fail with `AccessDenied` on assume-role. Mitigation:
  keep a terminal session with the old role ARN noted before applying.
- **If the role got destroyed:** re-run `terraform import` from the bootstrap
  stack against the original name (AWS may take a few minutes to fully
  delete; `import` will fail until that completes, then the role can be
  recreated). Out-of-band, ask AWS support for an undelete if within the
  retention window.
- **If the policy is wrong** (deploys fail with new `AccessDenied` on a
  resource that worked before): edit the bootstrap policy and reapply. This
  is the normal "missing permission" loop — exactly what this restructure
  was meant to enable.

The app stack is not at risk in any of these scenarios; only the deployer's
ability to apply the app stack is affected. Worst case: a window of broken
deploys until rollback completes. There is no path in which app-state
resources are destroyed.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `terraform import` matches the wrong resource ID format | Medium | Plan shows recreate, blocking apply | Phase 2 explicitly checks plan output before apply |
| Naming-convention drift between stacks | Low | Bootstrap policy too narrow, app deploys fail with `AccessDenied` | Both stacks construct ARNs from `${project}-${env}` — change-detected by CI plan |
| Developer applies bootstrap with wrong AWS profile | Medium | Role created in wrong account | Bootstrap README requires `aws sts get-caller-identity` check before apply; tfvars pin account-id-derived names |
| `terraform state rm` runs against wrong workspace | Low | Loss of state for a real resource | Run rm with `-dry-run` first; ensure separate tfstate keys |
| Missing log-group permissions still cause deploy failures | Low | Same incident repeats | Phase 6 follow-up PR explicitly tests this |
| New AWS resource added to app stack between Phase 1 and Phase 4 | Medium | App deploy fails post-cutover with new `AccessDenied` | Freeze app-stack changes during the cutover window; communicate to team |

## Out of scope

Explicitly **not** doing in this ticket, even though they're tempting:

- Restructuring app Terraform into more modules. Keep it as-is.
- Migrating to Terraform Cloud / Atlantis / any remote-runner. Local apply
  with SSO is the right model for a rarely-changed stack.
- Generalizing the bootstrap pattern to other USTC services. Premature —
  this is the only service that needs it today. Extract later if/when a
  second service needs the same pattern.
- Adding drift-detection automation for the bootstrap stack. Manual
  inspection at apply time is fine for a stack that changes ~quarterly.

## Validation checklist (pre-merge)

- [ ] `terraform plan` in `terraform/bootstrap/` shows no unexpected diffs after import.
- [ ] `terraform plan` in `terraform/` (after Phase 4) shows no diffs.
- [ ] `aws iam get-role` confirms role still exists with original ARN.
- [ ] `aws iam get-role-policy` confirms log-group permissions are present.
- [ ] CI deploy succeeds on a follow-up PR that adds a new Lambda.
- [ ] `terraform/bootstrap/README.md` exists and answers: who, when, how.
- [ ] CODEOWNERS protects `terraform/bootstrap/**`.
- [ ] Cutover runbook is in the PR description.

## Open questions

1. **Which AWS account-level role do developers use for `aws sso login`?**
   The bootstrap README needs to name it. (Likely an existing AWS SSO
   permission set — confirm with platform team.)
2. **Should `terraform/bootstrap/` use S3-backed or local state?** Plan
   above assumes S3 (consistency with app stack, durability). Alternative:
   local state checked into the repo via `git-crypt` or similar — adds
   complexity and isn't justified by the change cadence. Recommendation:
   stay with S3.
3. **Does any other USTC repo's CI assume this same role
   (`ustc-github-actions-oidc-deployer-role`)?** If yes, this restructure
   needs coordination with those repos. Naming suggests it might be shared.
   Confirm before applying.
