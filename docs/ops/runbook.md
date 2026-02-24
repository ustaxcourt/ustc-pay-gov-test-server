# USTC Pay.gov Dev Server — Operations Runbook

> **Audience.** On‑call engineers and maintainers responsible for the Dev Server that mocks Pay.gov for development and integration testing. This service is deployed to AWS (Terraform‑managed) and fronted by a custom dev domain; it serves SOAP, a small REST surface, and static WSDL/XSD/HTML artifacts. 

---

## 1) Quick Facts (TL;DR)

- **Service name:** USTC Pay.gov Dev Server (mock).   
- **Public base URL (dev):** `https://pay-gov-dev.ustaxcourt.gov`.   
- **Auth:** `Authentication: Bearer <ACCESS_TOKEN>` on requests hitting this server.   
- **Contracts served:** `wsdl/TCSOnlineService_3_1.wsdl`, `wsdl/TCSOnlineService_3_1.xsd`, `wsdl/tcs_common_types.xsd` (+ `html/pay.html`).   
- **Integration test (deployed):** `npm run test:integration:prod` (requires `.env.prod`).   
- **Local dev:** `npm run dev` (assets from filesystem when `NODE_ENV=local`). 

---

## 2) Service Endpoints & Health

### 2.1 Public Endpoints (Dev)
- **Base:** `https://pay-gov-dev.ustaxcourt.gov` (custom domain).   
- **WSDL (example):** `https://pay-gov-dev.ustaxcourt.gov/wsdl/TCSOnlineService_3_1.wsdl` — should return the WSDL XML.   
- **XSDs (examples):**  
  - `.../wsdl/TCSOnlineService_3_1.xsd`  
  - `.../wsdl/tcs_common_types.xsd`   
- **Mock UI:** `https://pay-gov-dev.ustaxcourt.gov/html/pay.html` — renders **Complete/Cancel** page. 

> **Note:** A dedicated health route isn’t documented in the README; treat **WSDL fetch** + **Mock UI fetch** + **prod integration test** (below) as the composite health check. 

### 2.2 Composite Health Check (SOP)
1. `curl -I https://pay-gov-dev.ustaxcourt.gov/wsdl/TCSOnlineService_3_1.wsdl` → **200** expected.   
2. `curl -I https://pay-gov-dev.ustaxcourt.gov/html/pay.html` → **200** expected.   
3. From the repo workspace (with `.env.prod` set), run:  
   ```bash
   npm run test:integration:prod
   ```

All deployed integration tests should pass.

***

## 3) Common Operational Tasks

### 3.1 Rotate `ACCESS_TOKEN`

**When:** Scheduled (e.g., quarterly) or after any suspected leak.

**Where the token lives**

*   **Runtime:** environment variable used by the service. Requests must include `Authentication: Bearer <ACCESS_TOKEN>`.
*   **Config source:** maintained in `.env.prod` for deployed testing; injected into the runtime at deploy time. Do **not** commit secrets.

**Procedure**

1.  **Generate** a new cryptographically strong value.
2.  **Update** the deployment secret/parameter store (per your environment) so that the application environment picks up the new `ACCESS_TOKEN`.
3.  **Coordinate** with **clients** (Payment Portal dev environment and any test harnesses) to update their request header. The server expects the header exactly as:
        Authentication: Bearer <ACCESS_TOKEN>
    (Mismatch → `401`.)
4.  **Redeploy** the service or roll the environment so the new token is active.
5.  **Verify** by running the **Composite Health Check** and the **deployed integration tests**.

**Rollback**

*   Reapply the previous token value in the environment and notify clients to revert; re‑run verification tests. (Use only if clients cannot update promptly.)

### 3.2 Manage S3 Artifacts (WSDL/XSD/HTML)

**What must exist in S3 (prod):**

*   `html/pay.html`
*   `wsdl/TCSOnlineService_3_1.wsdl`
*   `wsdl/TCSOnlineService_3_1.xsd`
*   `wsdl/tcs_common_types.xsd`

**Why it matters**

*   In **production mode** the service reads these from **S3**; missing files cause 404s/route failures even if the app is running. In **local mode** (`NODE_ENV=local`) it reads from the filesystem.

**Procedure**

1.  **Upload/replace** artifacts to the designated bucket and paths (confirm your environment’s bucket name and prefix; the README lists required files but not the bucket identifier).
2.  **(Optional) Versioning/checksums** — enable S3 versioning and keep SHA‑256 sums of artifacts alongside releases for traceability.
3.  **Validate** by fetching each public path (see **Composite Health Check**).

***

## 4) Incident Response

### 4.1 Error Taxonomy & Triage

| Symptom                                                 | Likely Cause                                                                          | What to Check / Fix                                                                                                                                                                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **401 Unauthorized** on SOAP/REST                       | Missing/invalid `ACCESS_TOKEN` header                                                 | Confirm clients send `Authentication: Bearer <ACCESS_TOKEN>`. Check current token value in runtime env; rotate if compromised; retry. |
| **404 on WSDL/XSD/HTML**                                | Required artifact absent from S3 or wrong key                                         | List S3 prefix for `wsdl/` and `html/`; (re)upload files; re‑fetch `.../wsdl/TCSOnlineService_3_1.wsdl` & `.../html/pay.html`.        |
| **CORS errors** in consuming app                        | Domain/origin not allowed (if enforced at a layer) or browser cached preflight result | Validate headers at the service or CDN/ALB; re‑test with `curl` vs browser; clear cache; confirm WSDL/HTML are retrievable directly.  |
| **Redirect returns to wrong URL** after Complete/Cancel | App supplied incorrect success/cancel URLs at initiation                              | Inspect the app’s initiation request; confirm mock UI redirects to the exact URLs provided.                                           |
| **Integration tests fail (prod)**                       | Env var mismatch, token mismatch, or artifact missing                                 | Run `npm run test:integration:prod` and read failures; verify `BASE_URL`, token, and S3 artifacts exist.                              |
| **TLS errors / certificate expired**                    | ACM certificate not renewed or DNS mis‑pointed                                        | Check certificate on `pay-gov-dev.ustaxcourt.gov`; renew/validate ACM; confirm Route 53 records and ALB target health.                |

### 4.2 First‑Hour Checklist

1.  **Reproduce & capture**: exact URL, headers (omit secrets), timestamps.
2.  **Fetch WSDL & HTML**: confirm **200** for both paths.
3.  **Auth sanity**: make a request with the known good `ACCESS_TOKEN` header; expect **200**; without it expect **401**.
4.  **Run deployed integration tests**:
    ```bash
    npm run test:integration:prod
    ```
    Use failures to localize (auth vs artifacts vs routing).
5.  **Infra view**: check ALB target health and recent logs for 4xx/5xx spikes (CloudWatch/ALB access logs per your environment).
6.  **Communicate**: post status in on‑call channel; if token rotation is involved, coordinate with Payment Portal maintainers.

***

## 5) Standard Changes

### 5.1 Post‑Deploy Verification (Dev)

After any Terraform apply or pipeline deploy to the dev account:

1.  **Artifacts present** in S3 (`html/` and `wsdl/`).
2.  **Fetch WSDL** from the public URL — **200** and valid XML.
3.  **Mock UI** loads — **200** and buttons render.
4.  **Deployed integration tests**:
    ```bash
    npm run test:integration:prod
    ```
    All tests pass.

### 5.2 Promoting Updated Artifacts

1.  Place new `wsdl/*.wsdl`, `wsdl/*.xsd`, and/or `html/pay.html` in S3.
2.  If changing contract shape, **communicate** to Payment Portal maintainers; run their integration tests as well. [USTC Payment Portal](https://github.com/ustaxcourt/ustc-payment-portal/)
3.  Keep previous versions (S3 versioning) for quick rollback.

***

## 6) Configuration Reference

| Name           | Description                                                              | Where Set                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BASE_URL`     | Public base of the Dev Server (custom domain in dev; localhost in local) | Environment / `.env`, `.env.prod`                                                |
| `ACCESS_TOKEN` | Bearer token required by server; must be sent by clients                 | Secret/parameter store; surfaced to runtime; referenced by `.env.prod` for tests |
| `PORT`         | Local Express port                                                       | `.env` (local only)                                                              |
| `NODE_ENV`     | `local` uses filesystem for artifacts; `production` uses S3              | Environment / `.env`, `.env.prod`                                                |

***

## 7) Dependencies & Integrations

*   **Payment Portal (Dev)** — primary consumer of this server; its dev config points to the Dev Server for SOAP/REST calls and user redirect to mock UI. Coordinate token rotations and contract changes., [USTC Payment Portal](https://github.com/ustaxcourt/ustc-payment-portal/)
*   **S3** — hosts WSDL/XSD/HTML for production mode (exact bucket/prefix per environment). Ensure artifacts exist before declaring green.
*   **Custom domain** — `pay-gov-dev.ustaxcourt.gov` must have valid DNS and TLS (ACM).

***

## 8) Playbooks

### 8.1 “401 Everywhere” (Auth break)

1.  Confirm the **current token** value in runtime.
2.  Make a manual call with that token set in the `Authentication` header → expect **200**.
3.  If **401** persists → rotate token and broadcast to consumers; retest.

### 8.2 “WSDL 404”

1.  List S3 keys under `wsdl/` and confirm `TCSOnlineService_3_1.wsdl` exists.
2.  Reupload if missing; re‑fetch via public URL; run deployed integration tests.

### 8.3 “UI Doesn’t Redirect Back”

1.  Check the **success/cancel URLs** passed at initiation by the calling app.
2.  Confirm the mock UI only redirects to what it was given; fix the caller’s parameters.

***

## 9) References

*   **Repo README (commands, env vars, artifacts, domain):** <https://github.com/ustaxcourt/ustc-pay-gov-test-server> [USTC Pay Test server](https://github.com/ustaxcourt/ustc-pay-gov-test-server)
*   **Payment Portal (consumer):** <https://github.com/ustaxcourt/ustc-payment-portal/>
*   **Terraform docs (link stub in repo — expand with your env details):** `/terraform` (fill in bucket name, backend, workspaces). [USTC Pay Test server Terraform](https://github.com/ustaxcourt/ustc-pay-gov-test-server/blob/main/terraform/README.md)
