# Contributing to the USTC Pay.gov Dev Server

Thank you for your interest in contributing!  
This repository houses the **mock Pay.gov Dev Server** used by USTC applications and the USTC Payment Portal during development. Contributions improve developer experience, reliability, and testability.

This document explains how to set up your environment, run tests, follow coding conventions, propose changes, and submit pull requests.

---

## 1. Getting Started

### 1.1 Prerequisites
- **Node.js** — use the version defined in `.nvmrc`, if present.
- **npm** — required to install dependencies and run scripts.
- **AWS CLI** — if working on Terraform‑related deployment tasks.
- **Terraform** — for infra changes in `/terraform` or `/docs/deploy/terraform.md`.

### 1.2 Clone and Install

```bash
git clone https://github.com/ustaxcourt/ustc-pay-gov-test-server.git
cd ustc-pay-gov-test-server
npm install
```

***

## 2. Running the Application Locally

The Dev Server can run entirely locally, including serving SOAP, REST, and the mock HTML UI.

### 2.1 Environment Variables

Create a `.env` file:

    BASE_URL=http://localhost:3366
    ACCESS_TOKEN=local-dev-token
    PORT=3366
    NODE_ENV=local

Local mode uses **filesystem** assets instead of S3.

### 2.2 Start Local Dev Server

```bash
npm run dev
```

The service will bind to the port specified in `.env`.

***

## 3. Testing

### 3.1 Unit Tests

```bash
npm run test
```

### 3.2 Local Integration Tests

Spin up the local dev server first (`npm run dev`), then:

```bash
npm run test:integration
```

These tests validate SOAP, REST, and artifact serving.

### 3.3 Deployed Integration Tests

Used to validate the deployed dev instance at  
`https://pay-gov-dev.ustaxcourt.gov`.

Requires `.env.prod` containing:

    BASE_URL=https://pay-gov-dev.ustaxcourt.gov
    ACCESS_TOKEN=<token-for-deployed-env>

Run:

```bash
npm run test:integration:prod
```

This ensures the deployed server is healthy and correctly configured.

***

## 4. Code Style & Conventions

### 4.1 TypeScript

*   Follow the project’s existing TypeScript patterns.
*   Keep functions small and predictable.
*   Ensure new modules have test coverage.

### 4.2 Linting/Formatting

Linting configuration is included in the repo; before committing:

```bash
npm run lint
npm run format
```

### 4.3 Error Handling

*   Surface clear 4xx/5xx context in logs.
*   Avoid logging sensitive data (token values, PII, payment info).

***

## 5. Architecture Documentation & ADRs

The repository includes an ADR directory (`/doc/architecture/decisions` or `.adr-dir`).  
When introducing changes that alter architecture, behavior, or external interfaces:

1.  Create a new ADR:
    ```bash
    npx adr new "Short title for decision"
    ```
2.  Document:
    *   Problem
    *   Options
    *   Decision
    *   Consequences

Keep decisions consistent with `/docs/architecture/overview.md`.

***

## 6. Using Changesets (Versioning & Publishing)

This package is published to npm and uses **Changesets** to manage semantic versions.

### 6.1 Starting a Changeset

After completing work on a branch:

```bash
npx changeset add
```

Follow the prompts (choose patch/minor/major).

### 6.2 Workflow

1.  Open PR with your changes + changeset.
2.  When merged, an automated PR will be created to release the new version.
3.  Merging that PR triggers npm publish.

See `/docs/release.md` for the full release playbook.

***

## 7. Branching & Pull Requests

### 7.1 Branch Naming

All work should be done in **feature branches** created from `main`.
Branches must include a **work type prefix** and a **ticket identifier**, but the ticket format depends on the system where the work item originated (e.g., GitHub Issues, Jira, internal systems).

### Examples

Use one of the following formats depending on where the ticket lives:

    # GitHub Issue
    feat/1234-add-transaction-logging
    bugfix/987-fix-timeout-behavior
    docs/42-update-api-reference

    # Jira or other system with key prefixes
    feat/PAY-1234-add-transaction-logging
    bugfix/PAY-567-fix-timeout-behavior
    docs/PAY-88-update-api-reference

    # Internal lightweight issue IDs
    feat/issue1-add-transaction-logging
    docs/issue17-update-api-reference

### Notes

*   Always start branches with one of the standard prefixes:
    `feat/`, `bugfix/`, `docs/`, `refactor/`, `chore/`, `test/`.
*   Use **kebab-case** for readability.
*   The ticket identifier should be the first element after the prefix.
*   If unsure which identifier to use, match the system where the ticket originated.

### 7.2 PR Requirements

Each PR must include:

*   [ ] Description of the change
*   [ ] Tests updated or added
*   [ ] Documentation updated (if applicable)
*   [ ] Changeset included (`npx changeset add`)
*   [ ] ADR added if architecture is affected
*   [ ] No secrets committed

### 7.3 PR Review Expectations

*   Expect reviewers to ask about error handling, test coverage, and backward compatibility with the Payment Portal repo.

***

## 8. Issue Templates (Suggested)

### 8.1 Feature Request — Simulated Outcomes

    Title: Simulated outcome: <pending|fail> trigger
    Description: Describe the desired trigger (header, query param, amount).
    Context: Why this helps dev/testing.
    Acceptance Criteria: ...

### 8.2 Bug Report

    Title: <endpoint|workflow> unexpected behavior
    Steps to Reproduce:
    Expected:
    Actual:
    Logs (omit secrets):

### 8.3 Infrastructure Issue

    Title: Terraform/S3/Domain problem
    Description:
    Environment:
    Verification Performed:

***

## 9. Compatibility With Payment Portal

This service is tightly coupled with the **USTC Payment Portal** dev environment.  
When making changes to SOAP/REST behavior, artifacts, or redirect patterns:

*   Coordinate early with Portal maintainers.
*   Confirm compatibility with their integration tests.
*   Update `/docs/compatibility.md` if behavior changes.

***

## 10. Communication

For security‑related discussions, see `/docs/SECURITY.md`.  
For architectural discussions, propose ADRs.  
For operational issues, refer to `/docs/ops/runbook.md`.

***

## 11. Thank You!

Your contributions make the development and testing experience smoother for every USTC team integrating payments.  
Please open an issue or PR if anything in this guide is unclear.

