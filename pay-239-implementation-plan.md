# PAY-239: Implement Dependency Update Tests for Pay.gov Test Server

## Context

PRs opened by Dependabot don't currently get the full PR validation treatment, so we don't have a strong signal on whether a dependency bump will break the test server. This plan closes that gap, focusing specifically on the integration-test piece (unit tests already run on Dependabot PRs).

## Acceptance Criteria

- [ ] Unit Tests get run on PRs opened by Dependabot
- [ ] Integration Tests get run on PRs opened by Dependabot

## Current State

- [.github/workflows/pr-validate.yml](.github/workflows/pr-validate.yml) — full validation (unit tests + terraform plan against AWS dev). Line 17 explicitly **skips** Dependabot:
  ```yaml
  if: ${{ github.actor != 'dependabot[bot]' && !startsWith(github.head_ref, 'dependabot/') }}
  ```
- [.github/workflows/dependabot-validate.yml](.github/workflows/dependabot-validate.yml) — Dependabot-only counterpart that runs `npm ci` + `npm test` (unit tests). **Already satisfies AC #1.**
- **Integration tests** ([test/integration/](test/integration/)) are not run in any workflow today. `npm run test:integration` uses `NODE_ENV=local` and hits a server at `localhost:3366` — see [running-locally.md](running-locally.md).

The only real gap is **AC #2: integration tests on Dependabot PRs**.

## Implementation Plan

### 1. Extend `dependabot-validate.yml` to run integration tests (single job)

Append the following steps to [.github/workflows/dependabot-validate.yml](.github/workflows/dependabot-validate.yml) after the existing `npm test` step:

1. **Build the server**: `npm run build` (produces `dist/`).
2. **Create a CI `.env`** with local-only values (inline in the workflow — no secret needed since these are purely local):
   ```
   BASE_URL=http://localhost:3366
   ACCESS_TOKEN=asdf123
   PORT=3366
   NODE_ENV=local
   ```
3. **Start the server in the background**: `node dist/server.js &` (or `npm start &`). Don't use `npm run dev` — its `concurrently` / `tsc --watch` / `nodemon` aren't appropriate for CI.
4. **Wait for readiness** (see "Readiness Check" below).
5. **Run integration tests**: `npm run test:integration`.

**Decision: same job, not split.** Simpler, shares the `npm ci` cache, and we don't currently need branch-protection-level isolation between unit and integration failures. We can split later if needed.

### 2. Readiness Check

When the server is started in the background, the shell returns immediately but the process needs a moment to bind to port 3366 and start accepting requests. If integration tests fire too fast, the first one can fail with a connection-refused error.

**Approach for this ticket:** poll an existing route (e.g. the SOAP `/wsdl` endpoint) with `curl --retry` or a small `until` loop until it responds successfully. No application code change needed.


### 3. Required-checks consideration

If branch protection requires the `validate` check from `pr-validate.yml`, Dependabot PRs will be blocked because that workflow skips them. Two fixes:

- Make the `validate` check non-required, **or**
- Add the new `dependabot-validate` check to required checks alongside it.

This isn't a code change but should be called out in the PR description so whoever merges updates branch protection if needed.

### 4. Verification

- Open a throwaway PR from a branch named `dependabot/test` (or trigger via `workflow_dispatch`) and confirm both unit and integration steps run and pass.
- Confirm [pr-validate.yml](.github/workflows/pr-validate.yml)'s exclusion guard still cleanly skips that same PR, so the two workflows don't double-run validation.

## Files Touched

- [.github/workflows/dependabot-validate.yml](.github/workflows/dependabot-validate.yml) — only file that needs to change.

## Out of Scope

- Enabling integration tests on the non-Dependabot PR path ([pr-validate.yml](.github/workflows/pr-validate.yml)).
- Adding a dedicated `/health` endpoint (can be a follow-up).
