# PAY-239: Implement Dependency Update Tests for Pay.gov Test Server

## Context

PRs opened by Dependabot don't currently get unit and integration tests run against them, so we don't have a strong signal on whether a dependency bump will break the test server. This plan closes that gap.

## Acceptance Criteria

- [x] Unit Tests get run on PRs opened by Dependabot
- [x] Integration Tests get run on PRs opened by Dependabot

## Current State

- [.github/workflows/pr-validate.yml](.github/workflows/pr-validate.yml) — full validation workflow. Line 17 explicitly **skips** Dependabot:
  ```yaml
  if: ${{ github.actor != 'dependabot[bot]' && !startsWith(github.head_ref, 'dependabot/') }}
  ```
- [.github/workflows/dependabot-validate.yml](.github/workflows/dependabot-validate.yml) — Dependabot-only counterpart. Already ran `npm ci` + unit tests (satisfied AC #1). Did not run integration tests.

## Implementation

Append the following steps to [.github/workflows/dependabot-validate.yml](.github/workflows/dependabot-validate.yml) after the existing unit-test step, in the **same job** (simpler, shares the `npm ci` cache):

1. **Build the server**: `npm run build` (produces `dist/`).
2. **Create a CI `.env`** inline (local-only values, no secret needed):
   ```
   BASE_URL=http://localhost:3366
   ACCESS_TOKEN=asdf123
   PORT=3366
   NODE_ENV=local
   ```
3. **Start the server in the background**: `node dist/server.js &`, capturing PID into `$GITHUB_ENV`.
4. **Wait for readiness**: poll `GET /wsdl` (unauthenticated, returns a static resource) until 200 or 30s ceiling. Without this, the first integration test can race the server boot and fail with connection-refused.
5. **Run integration tests**: `npm run test:integration`.
6. **Stop the server** in an `if: always()` step.

## Required-checks consideration

If branch protection requires the `validate` check from `pr-validate.yml`, Dependabot PRs are blocked because that workflow skips them. Either:

- Make the `validate` check non-required, **or**
- Add the `dependabot-validate` check to required checks alongside it.

Call this out in the PR description so whoever merges updates branch protection if needed.

## Verification

- Open a throwaway PR from a branch named `dependabot/test` (or trigger via `workflow_dispatch`) and confirm both unit and integration steps run and pass.
- Confirm [pr-validate.yml](.github/workflows/pr-validate.yml)'s exclusion guard still cleanly skips that same PR, so the two workflows don't double-run validation.

## Files Touched

- [.github/workflows/dependabot-validate.yml](.github/workflows/dependabot-validate.yml) — added build, env setup, background server, readiness poll, integration tests, teardown.
