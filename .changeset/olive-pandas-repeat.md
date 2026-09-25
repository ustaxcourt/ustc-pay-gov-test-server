---
"@ustaxcourt/ustc-pay-gov-test-server": minor
---

PAY-455: dependency updates for the week of 2026-09-14.

Declare a supported Node range for the first time:
`engines: { node: ">=24.20.0 <25.0.0" }`, and move the `.nvmrc` pin from
`24.19.0` to `24.20.0` so CI installs a Node that satisfies it. This is the
reason the release is a minor rather than a patch — consumers
below Node 24.20.0 will now see `EBADENGINE` on install.

- Upgrade `dotenv` from `^17.4.2` to `^18.0.0` (major). v18's changelog lists
  "Remove preloading", but the `dotenv/config` subpath export is still present
  and still honors `DOTENV_CONFIG_PATH` — both were verified directly against
  17.4.2 and 18.0.0 before upgrading. This matters because `jest.config.ts`
  loads env via `setupFiles: ["dotenv/config"]` and `test:integration:deployed`
  selects `.env.prod` via `DOTENV_CONFIG_PATH`.
- Refresh `package-lock.json` so every declared dependency resolves to its
  latest in-range version, including the direct dependencies
  `@aws-sdk/client-s3` (3.1135.0), `soap` (1.12.0), `fast-xml-parser` (5.11.1),
  `@types/aws-lambda` (8.10.163), and the dev dependencies `jest` (30.5.2) and
  `@changesets/cli` (3.0.3). This supersedes Dependabot PRs #182 and #183.
- Bump Terraform from `~> 1.15.0` to `~> 1.16.0` and the CI pin from `1.15.9`
  to `1.16.3` in both the deploy and PR-validate workflows.
- Refresh the Terraform provider lockfiles to `hashicorp/aws` 6.65.0,
  `hashicorp/archive` 2.8.1, and `hashicorp/random` 3.9.1.
- Replace the deprecated `data.aws_region.current.name` with
  `data.aws_region.current.region` in the `api-gateway` module, which the
  newer AWS provider flags during `terraform validate`.

TypeScript remains on 6.x; see `docs/dependency-caveats.md` for the reasoning.
