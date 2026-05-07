# PAY-303 — Separate CICD Deployer Terraform from App Infrastructure: Implementation Plan

## Goal

Resolve the chicken-and-egg where the GitHub OIDC deployer role's IAM
permissions live in the same Terraform state that uses the deployer role to
apply changes. After this work, deployer permissions are managed by a
separate `terraform/bootstrap/` stack, applied locally with elevated SSO
credentials, **before** the app deploy that needs them. The migration also
fixes the missing `logs:CreateLogGroup` permission that triggered the recent
failed deployment — adding it is the validation that the new structure works.

## Acceptance criteria (rewritten, sharp)

The Jira AC is right in spirit but underspecified. Replace with:

1. Bootstrap Terraform config lives in `terraform/bootstrap/` with its own S3
   state key (`ustc-pay-gov-test-server/bootstrap.tfstate`).
2. The OIDC deployer role and all of its policies are managed by the
   bootstrap config; **no** OIDC deployer resources remain in
   `terraform/*.tf`.
3. The role is migrated via `terraform state rm` (app) +
   `terraform import` (bootstrap). The role is **not** destroyed and
   recreated. Role ARN does not change. The
   `DEV_AWS_DEPLOYER_ROLE_ARN` GitHub secret does not change.
4. Bootstrap can be applied locally via `aws sso login` with documented IAM
   permissions required to apply.
5. App Terraform constructs deployer-related ARNs from naming convention
   (`${project}-${env}-*`); no `data "aws_iam_role"` lookup or
   `terraform_remote_state` reference re-couples the stacks.
6. Deployer policy grants `logs:CreateLogGroup`, `logs:DeleteLogGroup`,
   `logs:PutRetentionPolicy`, `logs:TagResource`, `logs:UntagResource`,
   `logs:DescribeLogStreams`, scoped to
   `arn:aws:logs:${region}:${account_id}:log-group:/aws/lambda/${project}-${env}-*`.
7. Repo-level `.github/CODEOWNERS` (net-new file) requires
   platform-reviewer approval for changes to `terraform/bootstrap/**`.
8. ADR `docs/adr/000X-bootstrap-stack.md` documents: why two stacks, why
   same repo, why constructed ARNs, why local apply.
9. Changeset entry follows existing `.changeset/*.md` convention (`patch`
   type, infra-only — no app code changes).
10. PR description contains a cutover runbook with explicit merge-freeze
    window.

## Guiding principles

1. **Two stacks, one repo.** Same repository (lower discovery friction),
   two independent Terraform states. CODEOWNERS provides separation.
2. **Bootstrap is rarely applied, manually.** Anyone with platform-tier AWS
   access can `terraform apply` from their workstation with `aws sso login`.
   CI does **not** apply bootstrap — that would defeat the purpose.
3. **No remote-state coupling.** Don't pull one stack's state into the
   other via `terraform_remote_state` — that re-creates the chicken-and-egg
   in a new shape. Both stacks construct ARNs from the shared naming
   convention.
4. **Move, don't recreate.** `aws_iam_role.github_actions_deployer` is in
   active use. Recreating could change the ARN and definitely cause a window
   of broken auth.
5. **Fix the original bug as part of the migration.** Adding the missing
   logs permissions is the post-cutover validation.

## Current state — inventory (verified)

Files that participate in OIDC deployer management today:

| File | What it does |
|---|---|
| [terraform/iam-oidc-github.tf](../terraform/iam-oidc-github.tf) | Defines `aws_iam_role.github_actions_deployer` and `aws_iam_role_policy.github_actions_permissions`. The whole file. |
| [terraform/locals.tf:6-9](../terraform/locals.tf#L6-L9) | `github_oidc_provider_arn`, `deploy_role_name`, `github_repo`, `tf_state_bucket_name` |
| [terraform/variables.tf:87-124](../terraform/variables.tf#L87-L124) | `github_org`, `github_repo`, `github_ref`, `deploy_role_name`, `github_oidc_provider_arn`, `tf_state_bucket_name` |
| [terraform/terraform.tfvars.template:44-47](../terraform/terraform.tfvars.template#L44-L47) | OIDC-related tfvars entries (will be removed from app template) |

Cross-references inside `iam-oidc-github.tf` that block a clean cut:

| Line | Reference | Resolution |
|---|---|---|
| 64-65 | `aws_iam_role.lambda_execution_role.arn` (GetRole + others) | Constructed: `arn:aws:iam::${account_id}:role/${project}-${env}-lambda-role` ([iam.tf:3](../terraform/iam.tf#L3)) |
| 72 | `aws_iam_role.lambda_execution_role.arn` (PassRole) | Same as above |
| 97, 102 | `module.s3.bucket_arn` | Constructed: `arn:aws:s3:::${env}-${project}` ([locals.tf:18](../terraform/locals.tf#L18)) — **note env-first ordering** |
| 113 | `aws_secretsmanager_secret.access_token.arn` | Constructed: `arn:aws:secretsmanager:${region}:${account_id}:secret:ustc/pay-gov/${env}/access-token-*` |
| 121-122 | `local.tf_state_bucket_name` | Move local into bootstrap as a string |
| **139** | **`local.bucket_name`** (missed in earlier draft) | Same construction as 97/102 — `arn:aws:s3:::${env}-${project}` |

**Naming-convention warning.** The Lambda role uses `${project}-${env}-*`
order ([iam.tf:3](../terraform/iam.tf#L3)) while the S3 bucket uses
`${env}-${project}` order ([locals.tf:18](../terraform/locals.tf#L18)).
Bootstrap policy must match each exactly. Getting this backwards = silent
`AccessDenied` on first deploy.

**Bug being fixed.** Existing policy grants only `logs:DescribeLogGroups`
and `logs:ListTagsForResource`. Net-new Lambda deploys need:
`logs:CreateLogGroup`, `logs:DeleteLogGroup`, `logs:PutRetentionPolicy`,
`logs:TagResource`, `logs:UntagResource`, `logs:DescribeLogStreams`. Scope
all to the lambda log-group ARN pattern.

## CI behavior (verified — informs cutover)

- [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml): runs
  `terraform plan` + `apply` on `push` to `main`. Uses concurrency group
  `terraform-dev-state` (serializes runs).
- [`.github/workflows/pr-validate.yml`](../.github/workflows/pr-validate.yml):
  runs `terraform plan` only (no apply) on PRs. Same concurrency group.
- **The only path that mutates app state is a merge to `main`.** This is
  what makes the merge-freeze (below) sufficient.

## Target structure

```
terraform/
├── bootstrap/                          # ← new stack
│   ├── README.md                       # who/when/how to apply
│   ├── backend.hcl                     # S3 key: bootstrap.tfstate
│   ├── main.tf                         # provider + role + policies
│   ├── locals.tf                       # constructed ARNs
│   ├── variables.tf
│   ├── versions.tf
│   └── terraform.tfvars                # checked in — no secrets, dev-only
├── (existing app stack — minus iam-oidc-github.tf)
└── README.md                           # add Bootstrap section
docs/
└── adr/
    └── 000X-bootstrap-stack.md         # ← new ADR
.changeset/
└── <new-changeset>.md                  # ← new patch entry
.github/
└── CODEOWNERS                          # ← net-new file
```

State layout (bucket `ustc-pay-gov-terraform-state`, already created by
[create-terraform-backend.sh](../terraform/create-terraform-backend.sh)):

| Stack | Key |
|---|---|
| App (existing) | `ustc-pay-gov-test-server/terraform.tfstate` |
| Bootstrap (new) | `ustc-pay-gov-test-server/bootstrap.tfstate` |

No bootstrap output is consumed by the app stack — the principle is
intentional non-coupling.

---

## Step-by-step plan

### Phase 0 — pre-flight (must clear before scaffolding)

These are blockers, not nice-to-haves. Do not start Phase 1 until each
returns a defensible answer.

1. **Confirm role isn't shared across repos.** The role name
   `ustc-github-actions-oidc-deployer-role` is not service-scoped.

   ```bash
   gh search code 'ustc-github-actions-oidc-deployer-role' --owner ustaxcourt
   gh search code 'DEV_AWS_DEPLOYER_ROLE_ARN' --owner ustaxcourt
   ```

   - If only this repo references it: proceed.
   - If other repos reference it: **stop**, file a coordination ticket. The
     restructure plan changes shape (multi-repo runbook, possibly rename
     role to `ustc-pay-gov-test-server-deployer`).

2. **Confirm SSO permission set for bootstrap apply.** Identify the AWS SSO
   role available to developers that grants `iam:CreateRole`,
   `iam:PutRolePolicy`, `iam:GetRole`, `iam:GetRolePolicy`,
   `iam:DeleteRolePolicy`, `iam:UpdateAssumeRolePolicy` on
   `arn:aws:iam::803663093283:role/ustc-github-actions-oidc-deployer-role`,
   plus `s3:GetObject`, `s3:PutObject`, `s3:ListBucket` on
   `arn:aws:s3:::ustc-pay-gov-terraform-state`. Document its name in
   `terraform/bootstrap/README.md` (Phase 5).

3. **Get Anurag's pre-design sign-off.** AC requires his review/contribution.
   Share this plan with him before scaffolding to avoid late rework.

### Phase 1 — scaffold `terraform/bootstrap/` (no apply)

Create the new directory. **Do not initialize state or apply yet.**

**`terraform/bootstrap/versions.tf`:**

```hcl
terraform {
  required_version = ">= 1.10.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

(Match the `~> 5.0` major to whatever the app stack uses in
[`terraform/.terraform.lock.hcl`](../terraform/.terraform.lock.hcl) — verify
before committing.)

**`terraform/bootstrap/backend.hcl`:**

```hcl
bucket       = "ustc-pay-gov-terraform-state"
key          = "ustc-pay-gov-test-server/bootstrap.tfstate"
region       = "us-east-1"
encrypt      = true
use_lockfile = true
```

(`use_lockfile = true` works — app stack runs Terraform 1.14.8 per
`deploy.yml:58`.)

**`terraform/bootstrap/main.tf`:**

```hcl
terraform {
  backend "s3" {}
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

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "GithubOIDCAssumeRole"
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = {
        Federated = var.github_oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_actions_permissions" {
  name = "${var.project_name}-${var.environment}-ci-deployer"
  role = aws_iam_role.github_actions_deployer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Lambda
      {
        Effect = "Allow"
        Action = [
          "lambda:CreateFunction",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:GetFunction*",
          "lambda:GetPolicy",
          "lambda:ListVersionsByFunction",
          "lambda:TagResource",
          "lambda:UntagResource"
        ]
        Resource = local.lambda_function_arn_pattern
      },
      # IAM read for self + lambda exec role
      {
        Effect = "Allow"
        Action = [
          "iam:GetRole",
          "iam:ListRolePolicies",
          "iam:GetRolePolicy",
          "iam:ListAttachedRolePolicies"
        ]
        Resource = [
          local.deployer_role_arn,
          local.lambda_role_arn
        ]
      },
      # Pass lambda exec role to Lambda service
      {
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = local.lambda_role_arn
      },
      # API Gateway
      {
        Effect = "Allow"
        Action = [
          "apigateway:GET",
          "apigateway:POST",
          "apigateway:PUT",
          "apigateway:PATCH",
          "apigateway:DELETE"
        ]
        Resource = [
          "arn:aws:apigateway:${var.aws_region}::/restapis*",
          "arn:aws:apigateway:${var.aws_region}::/domainnames*",
          "arn:aws:apigateway:${var.aws_region}::/basepathmappings*",
          "arn:aws:apigateway:${var.aws_region}::/deployments*"
        ]
      },
      # App S3 bucket
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket", "s3:Get*", "s3:List*"]
        Resource = local.app_bucket_arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${local.app_bucket_arn}/*"
      },
      # Access-token secret
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetResourcePolicy"
        ]
        Resource = local.access_token_secret_arn_pattern
      },
      # TF state bucket
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.tf_state_bucket_name}",
          "arn:aws:s3:::${var.tf_state_bucket_name}/*"
        ]
      },
      # CloudWatch Logs — existing perms PLUS the bug-fix additions
      {
        Effect = "Allow"
        Action = [
          "logs:DescribeLogGroups",
          "logs:ListTagsForResource"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:DeleteLogGroup",
          "logs:PutRetentionPolicy",
          "logs:TagResource",
          "logs:UntagResource",
          "logs:DescribeLogStreams"
        ]
        Resource = local.log_group_arn_pattern
      }
    ]
  })
}
```

**`terraform/bootstrap/locals.tf`:**

```hcl
locals {
  account_id = data.aws_caller_identity.current.account_id

  lambda_function_arn_pattern     = "arn:aws:lambda:${var.aws_region}:${local.account_id}:function:${var.project_name}-${var.environment}-*"
  lambda_role_arn                 = "arn:aws:iam::${local.account_id}:role/${var.project_name}-${var.environment}-lambda-role"
  deployer_role_arn               = "arn:aws:iam::${local.account_id}:role/${var.deploy_role_name}"
  app_bucket_arn                  = "arn:aws:s3:::${var.environment}-${var.project_name}"  # NOTE: env-first
  log_group_arn_pattern           = "arn:aws:logs:${var.aws_region}:${local.account_id}:log-group:/aws/lambda/${var.project_name}-${var.environment}-*"
  access_token_secret_arn_pattern = "arn:aws:secretsmanager:${var.aws_region}:${local.account_id}:secret:ustc/pay-gov/${var.environment}/access-token-*"
}
```

**`terraform/bootstrap/variables.tf`:** mirror only what's needed
(`project_name`, `environment`, `aws_region`, `deploy_role_name`,
`github_org`, `github_repo`, `github_oidc_provider_arn`,
`tf_state_bucket_name`).

**`terraform/bootstrap/terraform.tfvars`** (checked in — no secrets,
dev-only):

```hcl
project_name             = "ustc-pay-gov-test-server"
environment              = "dev"
aws_region               = "us-east-1"
deploy_role_name         = "ustc-github-actions-oidc-deployer-role"
github_org               = "ustaxcourt"
github_repo              = "ustc-pay-gov-test-server"
github_oidc_provider_arn = "arn:aws:iam::803663093283:oidc-provider/token.actions.githubusercontent.com"
tf_state_bucket_name     = "ustc-pay-gov-terraform-state"
```

(The account ID is already public via [terraform/locals.tf:5](../terraform/locals.tf#L5).)

**No `outputs.tf`.** The app stack does not consume bootstrap outputs;
adding them would invite future coupling.

### Phase 2 — delete OIDC from app stack (same PR, same branch)

In the same feature branch:

1. **Delete** `terraform/iam-oidc-github.tf`.
2. **Trim** `terraform/locals.tf:6-9` — remove `github_oidc_provider_arn`,
   `deploy_role_name`, `github_repo`. Keep `tf_state_bucket_name` only if
   still referenced elsewhere in app (verify with grep).
3. **Trim** `terraform/variables.tf` — remove `github_org`, `github_ref`,
   `deploy_role_name`, `github_oidc_provider_arn`. Keep
   `tf_state_bucket_name` if still used.
4. **Trim** `terraform/terraform.tfvars.template:44-47` — drop the OIDC
   block.

At this point the feature branch is internally consistent: `terraform plan`
in the app stack will show pending **deletions** of the OIDC role + policy
(because file references are gone but they're still in app state). That's
expected — Phase 4 fixes it via state surgery.

### Phase 3 — supporting deliverables

**`docs/adr/000X-bootstrap-stack.md`:** lift the Guiding Principles section
above into ADR form. Include:

- Context (chicken-and-egg incident).
- Decision (two stacks, same repo, no remote-state coupling, manual
  bootstrap apply).
- Consequences (drift risk on naming changes; mitigated by
  CODEOWNERS-gated bootstrap edits).
- Alternatives rejected (single stack with `terraform_remote_state`;
  separate repo; Atlantis/TFC).

**`.changeset/<auto-named>.md`:**

```markdown
---
"@ustaxcourt/ustc-pay-gov-test-server": patch
---

Move GitHub OIDC deployer role + policy into a separate `terraform/bootstrap/`
stack to eliminate the chicken-and-egg between deployer permissions and the
deploy that needs them. Adds the missing `logs:CreateLogGroup` and related
log-lifecycle permissions that blocked the recent net-new Lambda deploy.
```

**`.github/CODEOWNERS`** (net-new):

```
/terraform/bootstrap/  @<platform-handle> @<backup-handle>
/docs/adr/             @<platform-handle>
```

(Confirm handles with maintainer — likely Anurag plus a backup.)

**`terraform/bootstrap/README.md`:**

- **Purpose.** Why this stack (link to ADR).
- **Who can apply.** AWS SSO permission set name (from Phase 0 #2) and
  exact IAM permissions required.
- **How to apply.**

  ```bash
  aws sso login
  aws sts get-caller-identity   # MUST show account 803663093283
  cd terraform/bootstrap
  terraform init -backend-config=backend.hcl
  terraform plan
  terraform apply
  ```

- **When to apply.** Three triggers: new AWS resource type added to app
  stack needing new deployer perms; OIDC trust-policy rotation; new
  environment setup.
- **Runbook for "deploy failed with AccessDenied."** Identify missing
  IAM action → add to bootstrap policy → `apply` → retry app deploy.

**`terraform/README.md`:** add Bootstrap section linking to
`bootstrap/README.md` and the ADR.

### Phase 4 — cutover (the ordered surgery)

**This phase happens during the merge-freeze window. See "Cutover plan"
below.**

All commands from the **feature branch**, on a developer workstation with
`aws sso login` completed and verified:

```bash
aws sts get-caller-identity   # MUST be account 803663093283
git switch <feature-branch>   # bootstrap dir present, iam-oidc-github.tf deleted
```

**4a. Remove OIDC resources from app state (does NOT touch AWS):**

```bash
cd terraform
terraform init -backend-config=backend-dev.hcl
terraform state list | grep -E 'github_actions_(deployer|permissions)'
# Expected: 2 lines
terraform state rm aws_iam_role.github_actions_deployer
terraform state rm aws_iam_role_policy.github_actions_permissions
```

**4b. Verify app state is clean:**

```bash
terraform plan -input=false
```

Must show **zero changes** to the OIDC role/policy. If it shows a destroy,
**stop** — `state rm` didn't take.

**4c. Initialize bootstrap state and import role + policy:**

```bash
cd ../bootstrap
terraform init -backend-config=backend.hcl
terraform import aws_iam_role.github_actions_deployer ustc-github-actions-oidc-deployer-role
terraform import aws_iam_role_policy.github_actions_permissions \
  ustc-github-actions-oidc-deployer-role:ustc-pay-gov-test-server-dev-ci-deployer
```

(`aws_iam_role_policy` import ID format: `role-name:policy-name`. Both args
positional. Verify the policy name matches
`${project_name}-${environment}-ci-deployer` exactly.)

**4d. Verify import + plan diff:**

```bash
terraform plan
```

Expected output: only **policy-document changes** showing the new
`logs:*` statement being added. The role itself must show no changes
(no name change, no assume-role-policy change). If the role itself shows
in the diff, **stop** — investigate.

Save this plan output. Paste into the PR description for Anurag's review
(side-by-side: old policy from `aws iam get-role-policy` vs new policy
from `terraform plan`).

**4e. Apply bootstrap (now the role's policy gets the new logs perms):**

```bash
terraform apply
```

**4f. Validate in AWS:**

```bash
aws iam get-role --role-name ustc-github-actions-oidc-deployer-role \
  --query 'Role.Arn'
# Expected: arn:aws:iam::803663093283:role/ustc-github-actions-oidc-deployer-role (unchanged)

aws iam get-role-policy \
  --role-name ustc-github-actions-oidc-deployer-role \
  --policy-name ustc-pay-gov-test-server-dev-ci-deployer \
  --query 'PolicyDocument.Statement[?contains(Action, `logs:CreateLogGroup`)]'
# Expected: non-empty, scoped to /aws/lambda/ustc-pay-gov-test-server-dev-*
```

**4g. Merge the PR.** The next push-to-main `deploy.yml` run will:

- run `terraform plan` against app state → no OIDC-related diff (because
  state-rm + file-deletion are aligned)
- run `terraform apply` → no-op for OIDC; normal app-resource diffs only

### Phase 5 — post-cutover validation (separate follow-up PR)

Open a follow-up PR that adds a trivial new Lambda or otherwise triggers
log-group creation. The CI deploy must succeed where the previous
incident failed. This is the empirical proof the missing-perms bug is
fixed.

---

## Cutover plan (PR description verbatim)

This PR contains: new `terraform/bootstrap/` directory, deletion of
`terraform/iam-oidc-github.tf`, ADR, CODEOWNERS, changeset, doc updates.

**Cutover requires a merge-freeze window.** The only path that mutates app
state is a push to `main` (see `.github/workflows/deploy.yml` —
`push: branches: [main]` + `apply` on `exitcode == 2`). During the window
between Phase 4a (`state rm`) and Phase 4e (`bootstrap apply`), the app
stack's understanding of the role diverges from AWS reality. Any
unrelated push-to-main during this window risks unpredictable diffs.

**Sequence:**

1. **Reviewer approves PR.** Do not merge yet.
2. **Announce merge-freeze** on `terraform/**` paths to the team. Estimated
   window: ~30 min.
3. **Operator runs Phase 4a → 4f** from a developer workstation with the
   feature branch checked out and `aws sso login` complete. Save the
   `terraform plan` output from 4d to attach as a PR comment.
4. **Lift the freeze** as soon as 4f validation passes.
5. **Merge the PR.** `deploy.yml` runs and shows no OIDC-related diff.
6. **Open follow-up PR** for Phase 5 validation (trivial Lambda add).

If anything in 4a–4f goes wrong before 4e, the rollback is trivial because
AWS still has the original policy unchanged — see Rollback below.

---

## Rollback

| Failure point | State of AWS | Recovery |
|---|---|---|
| 4a `state rm` fails | Unchanged (rm is local). | Investigate; nothing to undo. |
| 4b plan shows pending destroy | Unchanged. | `terraform state mv` back into app state from local backup (`terraform.tfstate.backup` is auto-created); do NOT apply. |
| 4c `import` matches wrong ID | Unchanged. | `terraform state rm` from bootstrap; retry import with correct ID. |
| 4d plan shows role recreate | Unchanged. | `state rm` from bootstrap; retry — likely a name mismatch. |
| 4e apply fails partway | Possibly mutated. | Re-run `apply` (idempotent). If role/policy lost, see next row. |
| Role accidentally destroyed | Role gone, all CI deploys fail. | Re-import original ARN from AWS audit log; if past undelete window, recreate via bootstrap apply (ARN may differ — rotate `DEV_AWS_DEPLOYER_ROLE_ARN` GitHub secret). |
| Policy is wrong post-apply (deploys hit unexpected `AccessDenied`) | Mutated. | Edit bootstrap policy, re-apply. This is the normal "missing permission" loop — exactly what the new structure was designed to enable. |

App-stack resources are not at risk in any scenario; only the deployer's
ability to apply the app stack is. Worst case: window of broken deploys
until rollback completes.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `terraform import` matches wrong resource ID format | Medium | Plan shows recreate | 4d explicitly checks plan output before apply |
| Naming-convention drift between stacks (esp. S3 env-first vs project-first) | Medium | Bootstrap policy too narrow → AccessDenied | locals.tf comment flagging env-first; PR-time grep diff against current names |
| Operator uses wrong AWS profile | Medium | Role created in wrong account | Phase 4 mandates `aws sts get-caller-identity` check |
| `terraform state rm` runs against wrong workspace | Low | App-state corruption | `state list` confirmation in 4a; `terraform.tfstate.backup` recovery |
| Push to main during cutover window | Low (with freeze) | Unpredictable diff | Explicit merge-freeze announcement; concurrency group serializes anyway |
| Missing log-group perms still cause deploy failures | Low | Same incident repeats | Phase 5 follow-up PR explicitly tests |
| Role is shared with other repos | Unknown | Restructure breaks them | Phase 0 #1 resolves before scaffolding |
| New AWS resource added to app stack between cutover and Phase 5 PR | Low | Deploy fails with new AccessDenied | Communicate freeze; Phase 5 PR small and fast |

## Validation checklist (pre-merge)

- [ ] Phase 0 questions all answered in the PR description.
- [ ] `terraform plan` in `terraform/bootstrap/` shows only the logs-perm additions after import (output attached as PR comment).
- [ ] `terraform plan` in `terraform/` (after Phase 4a/4b) shows no OIDC diffs.
- [ ] `aws iam get-role` confirms role ARN unchanged.
- [ ] `aws iam get-role-policy` confirms log-group perms present and scoped.
- [ ] Side-by-side old/new policy diff in PR description (Anurag review).
- [ ] `docs/adr/000X-bootstrap-stack.md` exists and addresses alternatives.
- [ ] `.github/CODEOWNERS` protects `terraform/bootstrap/**` and `docs/adr/`.
- [ ] `terraform/bootstrap/README.md` answers who/when/how + AccessDenied runbook.
- [ ] Changeset entry exists (`patch`, infra-only language).
- [ ] Cutover runbook + merge-freeze instruction in PR description.
- [ ] Anurag has reviewed (AC requirement).

## DoD scoping notes

- **Test coverage ≥ 90%.** This PR changes zero application code; coverage
  delta is structurally zero. Call this out in the PR description so the
  gate is satisfied by exception, not handwaved.
- **Unit testing.** N/A for this change — Terraform validation (`terraform
  validate`, `terraform plan`) is the equivalent; both run in CI via
  `pr-validate.yml`.
- **Integration testing.** Phase 5 follow-up PR is the integration test —
  empirical proof a new Lambda deploys successfully end-to-end.
- **Security testing.** Three concrete checks (must appear in PR
  description):
  1. New statements are additions only — no broadening of existing
     resource scopes (diff old vs new policy JSON).
  2. New `logs:*` actions scoped to
     `arn:aws:logs:${region}:${account_id}:log-group:/aws/lambda/${project}-${env}-*`,
     not `*`.
  3. `assume_role_policy.Condition.StringLike.sub` unchanged
     (`repo:ustaxcourt/ustc-pay-gov-test-server:*`) — trust boundary
     not widened.
- **Performance testing.** N/A.
- **ADR.** `docs/adr/000X-bootstrap-stack.md` — see Phase 3.
- **Changeset.** See Phase 3.

## Out of scope

Explicitly **not** doing here:

- Restructuring app Terraform into more modules.
- Migrating to Terraform Cloud / Atlantis / any remote-runner.
- Generalizing the bootstrap pattern across USTC services. Extract later
  if/when a second service needs it.
- Adding drift-detection automation for bootstrap. Manual inspection at
  apply time is fine for a quarterly stack.
- Renaming the deployer role to be service-scoped. If Phase 0 #1 surfaces
  cross-repo usage, that becomes a separate ticket.

## Open questions (must resolve in Phase 0)

1. **SSO permission set name** for bootstrap operators (Phase 0 #2 — for
   bootstrap README).
2. **Cross-repo role usage** — `gh search code` in Phase 0 #1. If
   positive, plan changes shape.
3. **CODEOWNERS handles** — confirm Anurag plus a backup with maintainer.
