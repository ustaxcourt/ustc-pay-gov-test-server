# USTC Pay.gov Dev Server — Troubleshooting Guide

> **Scope.** Quick, actionable fixes for common issues when running or consuming the Dev Server that mocks Pay.gov for development/integration tests. This server exposes SOAP + a small REST surface and serves static artifacts (WSDL/XSD/HTML). It is fronted by a custom dev domain and requires a bearer token. 

---

## 1) First Response Checklist (5–10 min)

1. **Fetch artifacts (expect 200):**
   ```bash
   curl -I https://pay-gov-dev.ustaxcourt.gov/wsdl/TCSOnlineService_3_1.wsdl
   curl -I https://pay-gov-dev.ustaxcourt.gov/html/pay.html
   ```

If either fails, suspect missing S3 artifacts (prod mode) or routing/DNS.

2.  **Auth sanity check (expect 200 then 401):**
    ```bash
    curl -i -H "Authentication: Bearer $ACCESS_TOKEN" https://pay-gov-dev.ustaxcourt.gov/wsdl/TCSOnlineService_3_1.wsdl
    curl -i https://pay-gov-dev.ustaxcourt.gov/wsdl/TCSOnlineService_3_1.wsdl
    ```
    The first should succeed, the second should 401/deny where auth is enforced. Token rules are defined by the app.

3.  **Run deployed integration tests:**
    ```bash
    npm run test:integration:prod
    ```
    Requires `.env.prod` with `BASE_URL` and `ACCESS_TOKEN`. This is the project’s canonical deployed check.

4.  **If still red:** Check ALB/API logs and target health (your environment), then move to the symptom table below.

***

## 2) Common Symptoms → Likely Causes → Fixes

> Use this table to jump to a resolution quickly. Reference the repo README for exact file names, paths, and commands listed here.

### A) **401 Unauthorized** on SOAP/REST

*   **Likely causes**
    *   Missing/invalid bearer token header: `Authentication: Bearer <ACCESS_TOKEN>`.
    *   Token rotated in the service but **clients** (e.g., Payment Portal dev) didn’t update.

*   **What to do**
    1.  Confirm current `ACCESS_TOKEN` in the runtime environment.
    2.  Re‑try with the header set:
        ```bash
        curl -i -H "Authentication: Bearer $ACCESS_TOKEN" https://pay-gov-dev.ustaxcourt.gov/wsdl/TCSOnlineService_3_1.wsdl
        ```
        Expect **200** when correct.
    3.  Coordinate with consumers to update their headers; if needed, temporarily roll back to the prior token and retry end‑to‑end.

***

### B) **404 Not Found** for WSDL/XSD/HTML

*   **Likely causes**
    *   Required artifacts not present in the S3 bucket used by the deployed server (`production` mode uses S3; `local` uses filesystem).

*   **What to do**
    1.  Verify the files exist at the expected keys:
        *   `html/pay.html`
        *   `wsdl/TCSOnlineService_3_1.wsdl`
        *   `wsdl/TCSOnlineService_3_1.xsd`
        *   `wsdl/tcs_common_types.xsd`
    2.  (Re)upload missing files; confirm permissions allow the app to read them.
    3.  Re‑fetch:
        ```bash
        curl -I https://pay-gov-dev.ustaxcourt.gov/wsdl/TCSOnlineService_3_1.wsdl
        curl -I https://pay-gov-dev.ustaxcourt.gov/html/pay.html
        ```
        Expect **200**.

***

### C) **CORS errors** in browser clients

*   **Likely causes**
    *   Browser preflight blocked, or headers not set at the app/CDN/ALB layer.
    *   Artifact route succeeded via `curl` but fails in browser due to origin restrictions.

*   **What to do**
    1.  Validate **non‑browser** access (curl) works for WSDL/HTML.
    2.  Inspect response headers via browser dev tools; adjust CORS policy at the serving layer.
    3.  Clear cache and re‑test.

***

### D) **Redirect doesn’t come back to the app** after Complete/Cancel

*   **Likely causes**
    *   App provided wrong/blank `successURL` or `cancelURL` when initiating the transaction. The mock UI redirects **only** to what it received.

*   **What to do**
    1.  Inspect the **initiation** payload your app sent (Portal → Dev Server) and verify URLs.
    2.  Re‑initiate with correct URLs; repeat the flow through `/html/pay.html`.

***

### E) **Deployed integration tests fail**

*   **Likely causes**
    *   Wrong `BASE_URL`/`ACCESS_TOKEN` in `.env.prod`.
    *   Missing S3 artifacts (see B).
    *   TLS/DNS issues on `pay-gov-dev.ustaxcourt.gov`.

*   **What to do**
    1.  Ensure `.env.prod` contains:
            BASE_URL=https://pay-gov-dev.ustaxcourt.gov
            ACCESS_TOKEN=<current-token>
        Then run:
        ```bash
        npm run test:integration:prod
        ```
        
    2.  If failures persist, verify artifacts exist and the domain/certificate are valid.

***

### F) **TLS or certificate errors** for `pay-gov-dev.ustaxcourt.gov`

*   **Likely causes**
    *   Expired/invalid ACM certificate or misconfigured DNS/ALB target.

*   **What to do**
    1.  Inspect the certificate chain in the browser or via:
        ```bash
        echo | openssl s_client -servername pay-gov-dev.ustaxcourt.gov -connect pay-gov-dev.ustaxcourt.gov:443 2>/dev/null | openssl x509 -noout -dates -subject -issuer
        ```
    2.  Renew/validate ACM; confirm Route 53 alias records point to the correct ALB/API and that targets are healthy.

***

## 3) When the Problem Is Likely in the Client (Payment Portal)

*   **Signs**
    *   The Dev Server returns **200** for artifact checks and **deployed integration tests pass**, but end‑to‑end still fails.

*   **Next steps**
    1.  Confirm the Payment Portal’s **dev config** points at this server and includes the correct `ACCESS_TOKEN` header on its outbound calls.
    2.  Re‑run the Portal’s integration or E2E tests against the same base URL and token.
    3.  Check the Payment Portal repo docs for current/future workflows and compatibility notes. [USTC Payment Portal](https://github.com/ustaxcourt/ustc-payment-portal/)

***

## 4) Logs & Where to Look

*   **Application logs:** Use your platform’s logging (e.g., CloudWatch) to search for recent 4xx/5xx and auth errors.
*   **Access logs (ALB/API):** Identify spike patterns, user agents, and failing paths.
*   **Deployment notes:** If infra changed recently (Terraform), confirm S3 artifact uploads were performed post‑deploy (the app’s production mode depends on S3).

***

## 5) Ops SOPs (Quick Reference)

*   **Token rotation (summary):**
    1.  Generate a new token; update parameter/secret store.
    2.  Redeploy/roll app to pick up the token.
    3.  Notify clients to update `Authentication: Bearer <ACCESS_TOKEN>`.
    4.  Re‑run deployed integration tests.

*   **Post‑deploy verification:**
    ```bash
    curl -I https://pay-gov-dev.ustaxcourt.gov/wsdl/TCSOnlineService_3_1.wsdl
    curl -I https://pay-gov-dev.ustaxcourt.gov/html/pay.html
    npm run test:integration:prod
    ```
    All should pass before declaring green.

***

## 6) References

*   **Repo README** — commands, env vars, required artifacts, domain: [USTC Pay Test server](https://github.com/ustaxcourt/ustc-pay-gov-test-server)
*   **Payment Portal** — consumer of this server, for compatibility and flow details: [USTC Payment Portal](https://github.com/ustaxcourt/ustc-payment-portal/)
