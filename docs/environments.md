# USTC Pay.gov Dev Server — Environments

This document summarizes where the Dev Server runs, how clients point to it, and what to verify in each environment. It also includes ready‑to‑use examples for `.env` files and quick validation steps.

---

## 1) Environment Matrix

| Environment | Purpose | Base URL | Artifacts Source | Auth |
|---|---|---|---|---|
| **Local** | Run the server on your machine for quick development and integration tests | `http://localhost:<PORT>` (default 3366) | **Filesystem** (repo files) | `Authentication: Bearer <ACCESS_TOKEN>` |
| **Dev (shared)** | Team‑shared deployed instance used by Payment Portal (dev) and CI validation | `https://pay-gov-dev.ustaxcourt.gov` | **S3** bucket (required: `html/` and `wsdl/` assets) | `Authentication: Bearer <ACCESS_TOKEN>` |

> The Dev Server is a **mock** of Pay.gov for development only. It serves WSDL/XSD/HTML assets, hosts a mock SOAP interface, exposes a small REST surface, and includes a simple HTML page (`/html/pay.html`) with **Complete/Cancel** to emulate redirects back to the caller.

---

## 2) Configuration: Environment Variables

These variables are read by the application at startup.

| Variable | Example (Local) | Example (Dev) | Description |
|---|---|---|---|
| `BASE_URL` | `http://localhost:3366` | `https://pay-gov-dev.ustaxcourt.gov` | Public base URL the server advertises/uses |
| `ACCESS_TOKEN` | `local-dev-token` | `********` | Bearer token required by this service; clients must send it in `Authentication: Bearer <ACCESS_TOKEN>` |
| `PORT` | `3366` | *(set by platform; not used on hosted instance)* | Local Express port |
| `NODE_ENV` | `local` | `production` | Local uses filesystem; production uses S3 for artifacts |

### 2.1 Sample `.env` (Local)
Create `./.env` in the repo root:
```env
BASE_URL=http://localhost:3366
ACCESS_TOKEN=local-dev-token
PORT=3366
NODE_ENV=local
```

### 2.2 Sample `.env.prod` (Used to test the deployed dev instance)

Create `./.env.prod` **locally** (do not commit secrets):

```env
BASE_URL=https://pay-gov-dev.ustaxcourt.gov
ACCESS_TOKEN=<current-dev-access-token>
NODE_ENV=production
```

***

## 3) Required Artifacts (Deployed Dev)

In the **Dev (shared)** environment, the server reads the following from **S3**:

    html/pay.html
    wsdl/TCSOnlineService_3_1.wsdl
    wsdl/TCSOnlineService_3_1.xsd
    wsdl/tcs_common_types.xsd

If any of these are missing, SOAP clients and the mock UI can fail with 404/route errors even though the service is up. After every deploy or artifact update, verify that these keys exist and are readable by the app.

> In **Local**, these same files are served from the repository’s filesystem when `NODE_ENV=local`.

***

## 4) How Clients Point to Each Environment

### 4.1 Local

*   **Base URL:** `http://localhost:3366` (or your chosen port)
*   **Auth header:**
        Authentication: Bearer local-dev-token
*   **Typical workflow:** Run `npm run dev`, then run **local** integration tests (`npm run test:integration`) or point your local Payment Portal instance at the local Dev Server.

### 4.2 Dev (shared)

*   **Base URL:** `https://pay-gov-dev.ustaxcourt.gov`
*   **Auth header:**
        Authentication: Bearer <current-dev-access-token>
*   **Typical workflow:** The Payment Portal’s **dev** environment is configured to call this server. Downstream apps initiate a transaction through the Portal, which receives a token and redirect URL pointing to `…/html/pay.html`. After the user selects **Complete** or **Cancel**, the app completes the transaction via the Portal, which calls the Dev Server again.

***

## 5) Switching Environments

*   **From Local → Dev:**  
    Update your client/Portal config to use the Dev base URL and current `ACCESS_TOKEN`. For repository‑provided tests, set `.env.prod` and run `npm run test:integration:prod`.

*   **From Dev → Local:**  
    Point your client/Portal back to `http://localhost:<PORT>`, set `NODE_ENV=local`, and ensure the filesystem artifacts are present.

***

## 6) Quick Verification Checklists

### 6.1 Local Verification

1.  Start server:
    ```bash
    npm run dev
    ```
2.  Verify artifacts:
    ```bash
    curl -I http://localhost:3366/wsdl/TCSOnlineService_3_1.wsdl
    curl -I http://localhost:3366/html/pay.html
    ```
3.  Run local integration tests:
    ```bash
    npm run test:integration
    ```

### 6.2 Dev (shared) Verification

1.  Artifact checks:
    ```bash
    curl -I https://pay-gov-dev.ustaxcourt.gov/wsdl/TCSOnlineService_3_1.wsdl
    curl -I https://pay-gov-dev.ustaxcourt.gov/html/pay.html
    ```
2.  Deployed integration tests (requires `.env.prod`):
    ```bash
    npm run test:integration:prod
    ```
3.  If any checks fail:
    *   Confirm **S3 artifacts** exist.
    *   Confirm **DNS/TLS** for `pay-gov-dev.ustaxcourt.gov`.
    *   Confirm **ACCESS\_TOKEN** used by clients matches the deployed value.

***

## 7) Token Rotation Notes

*   The server enforces:
        Authentication: Bearer <ACCESS_TOKEN>
*   When rotating the token in Dev:
    1.  Update the token in your parameter/secret store and redeploy/roll the service.
    2.  Notify all consumers (Payment Portal dev, test harnesses) to update their header.
    3.  Re‑run the **Dev verification** steps above.

***

## 8) Cross‑References

*   **Architecture Overview:** `/docs/architecture/overview.md`
*   **Operations Runbook:** `/docs/ops/runbook.md`
*   **Mock SOAP API:** `/docs/api/mock-soap.md`
*   **REST API:** `/docs/api/rest.md`
*   **Release Playbook:** `/docs/release.md`
*   **Security Notes:** `/docs/SECURITY.md`
*   **Compatibility Matrix:** `/docs/compatibility.md`
