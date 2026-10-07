# USTC Pay.gov Test Server

**Instructions here should only be updated through `AGENTS.md`. `copilot-instructions.md` and `CLAUDE.md` are symlinks to `AGENTS.md`**

This is the USTC Pay.gov Test Server (`@ustaxcourt/ustc-pay-gov-test-server`). A mock of the Pay.gov SOAP API and hosted payment pages, used by the US Tax Court's development environments (primarily the USTC Payment Portal) in place of the real Pay.gov. It is published to npm and also deployed to AWS.

## Project Information

Stack: Node (pinned by `.nvmrc`, see `engines` in `package.json`) + TypeScript, Express 5, `soap` and `fast-xml-parser` for SOAP/XML, `luxon` for dates, and `@aws-sdk/client-s3` for storage. Jest with `ts-jest` handles unit and integration tests. Infrastructure is Terraform (API Gateway + Lambda + S3), deployed with GitHub Actions. Versioning and npm publishing use Changesets.

Core constraints:

- The server must mimic real Pay.gov behavior (SOAP request/response shapes, return codes, faults such as 4117 for a missing token). Changes to responses or the WSDL/XSD files can break the Payment Portal, so treat them as contract changes.
- Authentication (`ACCESS_TOKEN`) applies to deployed environments only. `APP_ENV=local` skips the check, and Terraform must never deploy with `app_env = "local"`. Do not weaken this guard. See [ADR 0004](doc/architecture/decisions/0004-app-env-vs-node-env.md).
- The same use-case code runs locally (Express + local filesystem) and deployed (Lambda + S3). Keep storage behind the `client/` abstraction and keep behavior identical in both modes.

### Repo Structure

- [`src/server.ts`](src/server.ts), [`src/app.ts`](src/app.ts), [`src/index.ts`](src/index.ts): Express entry points and app wiring for local runs and the published package. [`src/appContext.ts`](src/appContext.ts) builds the dependency context passed to use cases.
- [`src/lambdas/`](src/lambdas/): Lambda handlers (`handleSoapRequestLambda`, `getPayPageLambda`, `getResourceLambda`, `getScriptLambda`, `markPaymentStatusLambda`) plus `authenticateRequest` and `handleError`. These are bundled by `terraform/build.sh`.
- [`src/useCases/`](src/useCases/): one handler per SOAP operation or request (`startOnlineCollection`, `completeOnlineCollection`, `getDetails`, etc.).
- [`src/useCaseHelpers/`](src/useCaseHelpers/): shared pure logic for use cases (XML building, tracking ID generation, date formats, transaction status resolution).
- [`src/persistence/`](src/persistence/): save/get functions for initiated and completed transactions.
- [`src/client/`](src/client/): storage clients (`local/` filesystem, `s3/`).
- [`src/config/`](src/config/): `APP_ENV` / `NODE_ENV` handling.
- [`src/errors/`](src/errors/), [`src/types/`](src/types/): custom errors and shared types.
- [`src/static/`](src/static/): served `html/` pages and `wsdl/` / XSD files. Uploaded to S3 for deployed environments.
- [`test/integration/`](test/integration/): integration tests that run against a started server (`APP_ENV=local`).
- [`terraform/`](terraform/): root stack, `modules/{api-gateway,lambda,s3}`, and `bootstrap/` (state backend, applied once by a human). See [terraform/README.md](terraform/README.md). The `terraform/lambda-*-bundled.js` files are gitignored build output.
- [`doc/architecture/decisions/`](doc/architecture/decisions/): ADRs (see `.adr-dir`).
- [`docs/dependency-caveats.md`](docs/dependency-caveats.md): deferred upgrades and accepted vulnerabilities. Update it whenever you defer an upgrade or accept a vulnerability.
- [`.changeset/`](.changeset/): pending release notes. See [PUBLISHING.md](PUBLISHING.md).
- [`.github/workflows/`](.github/workflows/): `pr-validate.yml` (unit tests, build, integration tests, Terraform plan), `test.yml` (Node CI on push and PR to `main`), `deploy.yml` (deploys on push to `main` or manual dispatch), and `publish.yml` (on push to `main`, runs the Changesets action to open a release PR or publish to npm with OIDC provenance).

### Conventions

- Unit tests are colocated as `*.test.ts` next to the source and run with `npm test`. Integration tests live in `test/integration/`.
- Run `npm test` and `npm run build` before considering work done. For changes touching request/response behavior, also run `npm run test:integration` (requires the server running, see [running-locally.md](running-locally.md)). CI runs the same checks.
- Any user-facing or published-package change needs a changeset (`npx changeset add`, see [PUBLISHING.md](PUBLISHING.md)). Pick the semver bump deliberately.
- Local configuration is in `.env` (see `.env.example`). Never commit secrets or edit `.env.prod`.
- `AGENTS.md` is the source of truth for instructions. `CLAUDE.md` and `.github/copilot-instructions.md` are symlinks to it.

## Agent Expectations

- Campsite rule: you may notice that existing code violates some of the guidelines listed in these instructions. Limit incidental fixes to files you are already editing for the current task — do not open new files or start separate workstreams to address unrelated issues. Always leave those files better than you found them by applying established best practices and meeting test coverage objectives.
- **Be mindful of pagers!** Programs like `git`, `gh`, `aws`, `less`, etc. can freeze an interactive agent by waiting for keyboard input. ALWAYS ensure you pass `PAGER=cat` as an environment variable (e.g., `PAGER=cat git diff`), or use specific flags like `--no-pager`, to stream output properly.
- **Terminal buffer limitations!** The interactive shell has an input buffer character limit (often 1024 characters). Avoid using `cat << 'EOF' > ...`, `echo -e`, or `node -e "..."` to write large scripts or long strings directly via terminal injection. Exceeding the buffer limit will drop characters, mangle syntax, and trap the session in a broken `heredoc` sequence. Instead, ALWAYS use your agent's dedicated file-writing tools to construct or modify files larger than ~20 lines.
- Scratch files: feel free to write throwaway scripts, fixtures, and debug output to local files within the working tree. Clean these up before finishing or aborting a task — deleting scratch files you created is the one permitted exception to the `rm`/`rmdir` prohibition. Never leave temporary artifacts where they could be staged or committed by accident.
- Communication: when asking the developer questions, be concise but provide sufficient context to avoid back-and-forth. When providing instructions, be explicit and step-by-step to ensure clarity.
- Never execute `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git clean`, `git revert`, `git cherry-pick`, `git tag`, or `git stash` commands.
- You may remind the developer of the appropriate git commands, but never run them.
- Only execute read-only git commands like `git status`, `git diff`, `git log`, `git branch`, `git show`.
- The developer is responsible for reviewing and committing all code generated by the agent.
- Never execute destructive file operations like `rm`, `rmdir`, or `del`.
- Never use `sudo`, `chmod`, `chown`, `kill`, or `killall`.
- Never use `curl`, `wget`, or `eval`.
- Never run `terraform apply`, `terraform destroy`, or any AWS command that changes resources. `terraform fmt`, `validate`, and `plan` are fine. Provide apply commands for the developer to run manually.
- If a task requires any of these commands, provide the command for the developer to run manually.

### Project-specific Conventions

- **GitHub Actions `uses:` pinning**: before adding or editing a `uses:` line, search [`.github/workflows/`](.github/workflows/) for the same action (the name before the `@`) and pin to the version already used there — don't adopt a newer release, or default to the version you were trained on, just because one exists. Introduce a new version only deliberately; when you do, flag the now-out-of-sync workflows and ask the developer before updating them.
- **Dependency updates**: when you defer a major upgrade or accept a vulnerability, record it in [`docs/dependency-caveats.md`](docs/dependency-caveats.md) and describe the change in a changeset.
- **Generated files**: `dist/`, `coverage/`, and `terraform/lambda-*-bundled.js` are gitignored build output. Never hand-edit them or try to commit them; regenerate with `npm run build` or `terraform/build.sh`.

## Testing Conventions

- Do NOT write tests for functions that only return hardcoded constants or trivial passthroughs.

## Coverage Decisions

Before writing a new test or adding a coverage-ignore comment, use the following to determine the right path. Do not make this decision yourself without checking here first.

### Ambiguous cases — STOP and ask the developer before proceeding:

- Defensive `catch` blocks around code that is unlikely to throw in practice.
- Trivial passthroughs where it is unclear if the call site already has meaningful test coverage.
- Any case where you are unsure whether a test would catch a real bug.

When asking, use this format:

> "This code may not warrant a test — should I write one anyway, or add a coverage-ignore comment here? Here's why I'm asking: [reason]"

Do not proceed until the developer responds.
