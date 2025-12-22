# Publishing to npmjs.org

This document outlines the approach for publishing versioned updates of `@ustaxcourt/ustc-pay-gov-test-server` to npmjs.org, making them available via npm install.

## Prerequisites

- **Public GitHub repository**: Required for npm provenance.
- **npm Trusted Publishing**: Configured for the repo/workflow.
- **Changesets**: Used for versioning and changelog generation.

## Publishing Workflow

### 1. Development Phase

1. **Create a feature branch**:
   ```bash
   git switch -c feature/your-feature-name
   ```

2. **Make your changes** to the codebase.

3. **Add a changeset** to document your changes:
   ```bash
   npx changeset add
   ```
   - Select the package to version (`@ustaxcourt/ustc-pay-gov-test-server`)
   - Choose the semver bump type:
     - `patch`: Bug fixes and minor changes (0.1.0 → 0.1.1)
     - `minor`: New features, backward compatible (0.1.0 → 0.2.0)
     - `major`: Breaking changes (0.1.0 → 1.0.0)
   - Write a concise summary of changes for the changelog

4. **Commit and push**:
   ```bash
   git add .
   git commit -m "feat: your feature with changeset"
   git push -u origin feature/your-feature-name
   ```

5. **Open a Pull Request** to `main` and get it reviewed.

### 2. Versioning Phase

1. **Merge your PR** to `main`.

2. **Changesets bot** automatically opens a "Version Packages" PR that:
   - Consumes the changeset files
   - Updates `package.json` version
   - Updates/creates `CHANGELOG.md`

3. **Review the Version PR**:
   - Verify the version bump is appropriate
   - Check the changelog entry is clear and accurate
   - Merge the PR when ready to publish

### 3. Publishing Phase

1. **Automatic publish** via GitHub Actions:
   - On merge of the Version PR, the `publish.yml` workflow runs
   - Uses OIDC Trusted Publishing (no tokens)
   - Builds the package and publishes to npm with provenance

2. **Verify the publish**:
   ```bash
   npm view @ustaxcourt/ustc-pay-gov-test-server version
   npm view @ustaxcourt/ustc-pay-gov-test-server dist-tags
   ```

## Installation

Package can be installed:

```bash
# As a dependency
npm i @ustaxcourt/ustc-pay-gov-test-server

# As a dev dependency
npm i --save-dev @ustaxcourt/ustc-pay-gov-test-server
```

## Running

Once installed, the following command can be used to start the test server:

```
npx @ustaxcourt/ustc-pay-gov-test-server
```

When initially running the server with this command, you will be prompted to enter a port and access token for the test server to use. To update these variables, run the command with the following argument:

```
npx @ustaxcourt/ustc-pay-gov-test-server update-env
```

## Technical Implementation

### CI/CD Workflows

- **PR validate workflow** (`.github/workflows/pr-validate.yml`):
  - Runs on every PR
  - Builds and tests the code

- **Publish workflow** (`.github/workflows/publish.yml`):
  - Triggered after CI passes and on push to `main`
  - Uses `changesets/action@v1` to:
    - Create/update Version PR when changesets exist
    - Publish to npm when Version PR is merged

### Package Configuration

- **`package.json`**:
  ```json
    {
    "name": "@ustaxcourt/ustc-pay-gov-test-server",
    "version": "0.1.0",
    "description": "USTC Pay.gov test server",
    "main": "dist/index.js",
    "repository": {
        "type": "git",
        "url": "https://github.com/ustaxcourt/ustc-pay-gov-test-server"
    },
    "publishConfig": {
        "access": "public"
    },
    "scripts": {
        "build": "npx tsc",
        "test": "jest ./src",
        "ci:publish": "changeset publish --provenance"
    }
  }
  ```

- **`.changeset/config.json`**:
  ```json
  {
    "access": "public",
    "baseBranch": "main"
  }
  ```

## Example Workflow

Here's a complete example of making a change and publishing:

```bash
# 1. Create feature branch
git checkout main
git pull
git checkout -b fix/error-handling

# 2. Make your changes
# ... edit files ...

# 3. Add changeset
npx changeset add
# Choose: patch
# Summary: "Improve error handling in transaction requests"

# 4. Commit and push
git add .
git commit -m "fix: improve error handling in transaction requests"
git push -u origin fix/error-handling

# 5. Open PR and merge to main (via GitHub UI)

# 6. Wait for "Version Packages" PR to be created automatically

# 7. Review and merge "Version Packages" PR (via GitHub UI)

# 8. Verify publish succeeded
npm view @ustaxcourt/ustc-pay-gov-test-server version
# Should show the new version
```
