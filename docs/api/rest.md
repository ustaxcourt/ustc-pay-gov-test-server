# USTC Pay.gov Dev Server — REST API (Dev Integration)

> **Purpose.** This document describes the REST endpoints exposed by the **USTC Pay.gov Dev Server** that the **Payment Portal (dev)** calls during development. These endpoints supplement the mocked SOAP interface and the static artifacts (WSDL/XSD/HTML). This server is for **development and integration testing** only; it does **not** process real payments. 

---

## 1) Base URL & Authentication

- **Dev base URL:** `https://pay-gov-dev.ustaxcourt.gov` (custom domain for the deployed dev instance).   
- **Auth header (required for all REST and SOAP calls to this server):**

```bash
Authentication: Bearer \<ACCESS\_TOKEN\>
```

The server validates this header against the environment variable `ACCESS_TOKEN`; requests with a missing or incorrect token receive **401 Unauthorized**. Sample values for `BASE_URL` and `ACCESS_TOKEN` are defined for local and deployed contexts in `.env` / `.env.prod`. 

> **Notes**
> - The **Payment Portal (dev)** is configured to point to this server during development; it uses these endpoints in conjunction with SOAP operations and the mock UI flow. See the Payment Portal repository for how it consumes this service.   
> - Refer to the repo’s README for environment variables and testing commands (including deployed integration tests). 

---

## 2) Endpoints

> The repository README states that the **Payment Portal dev environment is configured to point to this application’s REST API**, but it does not enumerate each path explicitly. The examples below follow common conventions used by the service and its tests. Always consult the application source and integration tests in this repository to confirm exact paths before automating. 

### 2.1 Health (composite approach)

While no dedicated health route is documented, you can approximate health by fetching **artifacts** plus running the **deployed integration tests**:

- **WSDL check (200 OK expected):**
```bash
curl -I https://pay-gov-dev.ustaxcourt.gov/wsdl/TCSOnlineService_3_1.wsdl
```


*   **Mock UI check (200 OK expected):**
```bash
curl -I https://pay-gov-dev.ustaxcourt.gov/html/pay.html
```

*   **Prod integration tests (from repo, requires `.env.prod`):**
```bash
npm run test:integration:prod
```

### 2.2 Transaction Initiation (REST → SOAP bridge)

**Intent:** The Payment Portal (dev) initiates a transaction, which ultimately causes the Dev Server to emulate **Pay.gov** behavior and return a **token** and **redirect URL**. The user is then redirected to the mock pay page (`/html/pay.html`).

*   **Method/Path:** `POST` to the Dev Server’s REST initiation endpoint (see repository implementation for the exact path). Include the bearer token header.

*   **Request (example JSON):**
    ```json
    {
      "amount": 75.00,
      "currency": "USD",
      "referenceNumber": "CASE-2026-000123",
      "successURL": "https://app.dev.ustc.gov/pay/success",
      "cancelURL": "https://app.dev.ustc.gov/pay/cancel"
    }
    ```

*   **cURL (example):**
    ```bash
    curl -X POST \
      -H "Content-Type: application/json" \
      -H "Authentication: Bearer $ACCESS_TOKEN" \
      -d '{
        "amount": 75.00,
        "currency": "USD",
        "referenceNumber": "CASE-2026-000123",
        "successURL": "https://app.dev.ustc.gov/pay/success",
        "cancelURL": "https://app.dev.ustc.gov/pay/cancel"
      }' \
      https://pay-gov-dev.ustaxcourt.gov/api/transactions/initiate
    ```

*   **Response (example JSON):**
    ```json
    {
      "token": "DEV-ABC123TOKEN",
      "redirectURL": "https://pay-gov-dev.ustaxcourt.gov/html/pay.html?token=DEV-ABC123TOKEN",
      "status": "SUCCESS"
    }
    ```

> This aligns with the README’s described workflow (token + redirect URL returned; user is sent to the Dev Server’s mock UI). Confirm the exact REST path in the source/tests.

### 2.3 Transaction Completion (REST → SOAP bridge)

**Intent:** After the user returns from the mock UI to the app’s `successURL` (or `cancelURL`), the client completes the transaction with the stored token. The Dev Server returns a mock **tracking ID**.

*   **Method/Path:** `POST` to the Dev Server’s completion endpoint (see repository implementation for final path). Include the bearer token header.

*   **Request (example JSON):**
    ```json
    {
      "token": "DEV-ABC123TOKEN"
    }
    ```

*   **cURL (example):**
    ```bash
    curl -X POST \
      -H "Content-Type: application/json" \
      -H "Authentication: Bearer $ACCESS_TOKEN" \
      -d '{"token": "DEV-ABC123TOKEN"}' \
      https://pay-gov-dev.ustaxcourt.gov/api/transactions/complete
    ```

*   **Response (example JSON):**
    ```json
    {
      "trackingId": "MOCK-TRACKING-78901",
      "status": "SUCCESS"
    }
    ```

> As documented in the repo, the Payment Portal then relays this information back to the originating app. Verify the exact path and field names in the code and integration tests.

***

## 3) Mock Pay UI

The Dev Server hosts a minimal **HTML** page that simulates Pay.gov’s hosted pages:

*   **Path:** `/html/pay.html` (clickable from the `redirectURL` returned by initiation).
*   **Behavior:** Presents **Complete** and **Cancel** buttons, then redirects to the provided `successURL` or `cancelURL`. This mimics the real Pay.gov redirect loop during development.

***

## 4) Simulated Outcomes (Roadmap)

There are open issues to add explicit controls for simulating **pending** and **failed** outcomes (e.g., via special amounts, query parameters, or headers) so client apps can exercise non‑happy paths deterministically. Once implemented, this section will document the **exact triggers**. For now, the default behavior is **success** unless noted in release notes.

***

## 5) Errors

*   **401 Unauthorized** — Missing/invalid bearer token in `Authentication` header. Ensure your client uses the current `ACCESS_TOKEN`.
*   **404 Not Found** — If artifact‑backed routes fail (e.g., WSDL/XSD/HTML), confirm the required files exist in the S3 bucket used by the deployed instance. In local mode (`NODE_ENV=local`), the filesystem is used.

> For broader troubleshooting (CORS, TLS, redirects, ALB health), see the **Operations Runbook** and run the **deployed integration tests** to localize issues quickly.

***

## 6) Related Documents

*   **Mock SOAP API** — `/docs/api/mock-soap.md` (operations, example envelopes, artifacts). [USTC Pay Test server](https://github.com/ustaxcourt/ustc-pay-gov-test-server)
*   **Operations Runbook** — `/docs/ops/runbook.md` (health checks, incident triage, token rotation). [USTC Pay Test server](https://github.com/ustaxcourt/ustc-pay-gov-test-server)
*   **Deployment Guide (Terraform)** — `/docs/deploy/terraform.md` (backends, variables, DNS/TLS, post‑deploy checks). [USTC Pay Test server Terraform](https://github.com/ustaxcourt/ustc-pay-gov-test-server/blob/main/terraform/README.md)
*   **Payment Portal (consumer)** — how the client uses this server in dev. [USTC Payment Portal](https://github.com/ustaxcourt/ustc-payment-portal/)
*   **Project README** — environment variables, commands, artifacts, domain. [USTC Pay Test server](https://github.com/ustaxcourt/ustc-pay-gov-test-server)

