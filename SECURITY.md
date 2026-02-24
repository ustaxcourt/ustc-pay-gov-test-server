# USTC Pay.gov Dev Server — Security Notes

> **Scope.** This document captures the security stance for the **USTC Pay.gov Dev Server**, which **mocks** Pay.gov for development and integration testing. It summarizes authentication, data handling, secrets, logging, and operational practices specific to this service and its dev environment. **This service does not process real payments.** 

---

## 1) System Context (What this service is)

- A TypeScript/Express application that:
  - Serves **WSDL/XSD** and a minimal **HTML mock UI** (Complete/Cancel).  
  - Exposes **mocked SOAP** operations used by the USTC Payment Portal (`startOnlineCollection`, `completeOnlineCollection`).  
  - Provides a small **REST** surface for dev integration.  
  - In **production mode**, reads required artifacts (`html/pay.html`, `wsdl/*.wsdl`, `wsdl/*.xsd`) from **S3**; in **local** mode, from the filesystem. 
- The deployed dev instance uses a **custom domain**: `https://pay-gov-dev.ustaxcourt.gov`. 
- Authentication to this service is via an **HTTP bearer token** header:  
  `Authentication: Bearer <ACCESS_TOKEN>` (required by SOAP/REST where enforced). 

> For canonical Pay.gov semantics (fields, codes), use the official **Pay.gov Web Services Technical Overview**; this server only emulates behavior for dev/test. 

---

## 2) Threat Model (Dev Scope)

**In‑scope (dev):**
- Unauthorized access to the mock SOAP/REST endpoints (mitigated by bearer token). 
- Tampering with **WSDL/XSD/HTML** artifacts in S3 (mitigated by least‑privilege IAM and controlled artifact publishing). 
- Misconfiguration of **DNS/TLS** for the custom domain causing MITM or service disruption. 

**Out‑of‑scope (this service):**
- Real cardholder data (CHD) or PII processing. The app is a **mock** and must not be used for production payments or to store real payment data. 

---

## 3) Authentication & Authorization

- **Required header:**  
```

Authentication: Bearer \<ACCESS\_TOKEN>
```
Requests missing or using an invalid token will be rejected (e.g., **401 Unauthorized**) where enforced. Keep the token value confidential and rotate on a defined cadence (see §6). 

- **Token storage:** The token is an **environment variable** at runtime; local and deployed test contexts reference `.env` / `.env.prod` (never commit secrets). 

---

## 4) Data Handling & Privacy

- **No real payments or PII**: Do not submit or log real payment card data or PII. This is a dev/test mock; sample/test data only. 
- **Artifacts served** (WSDL/XSD/HTML) are static. Ensure they do not contain sensitive information. In production mode they are retrieved from **S3** (see §5). 
- **Redirect behavior**: The mock UI redirects to **caller‑supplied** success/cancel URLs. Callers are responsible for validating those destinations in the calling application. 

> For understanding how real Pay.gov treats data, consult the official Pay.gov documentation and keep it separate from this mock’s behavior. 

---

## 5) Infrastructure, TLS, and Artifacts

- **Custom domain & TLS**: The dev instance is fronted by `https://pay-gov-dev.ustaxcourt.gov`. Maintain valid TLS certificates (e.g., ACM) and correct Route 53 DNS records so clients always connect over HTTPS. 
- **S3 artifacts (prod mode)**: The deployed app reads `html/pay.html` and `wsdl/*.wsdl`/`*.xsd` from S3. Lock down write access (CI/deploy roles only), enable bucket versioning for rollback, and verify artifacts after deploy. 
- **Local mode**: When `NODE_ENV=local`, artifacts are read from the filesystem; this should be used only for local development. 

---

## 6) Secrets Management & Rotation

- **Secret:** `ACCESS_TOKEN` (bearer token value).  
- **Where stored:** Parameter store / secrets manager in the deployment environment; injected as an environment variable. `.env.prod` is used to drive **deployed integration tests** and must not be committed with real values. 

**Rotation procedure (summary):**
1. Generate a new token and update it in the secret store.  
2. Redeploy/roll the service to load the new token.  
3. Notify **consumers** (e.g., Payment Portal dev) to update their request header.  
4. Run **deployed integration tests** to confirm green:  
    ```bash
    npm run test:integration:prod
    ```

The README documents this command for validating the deployed instance.

**Emergency rollback:** Re‑apply the previous token in the environment and notify consumers to revert, then re‑verify.

***

## 7) Logging & Monitoring

*   **Application logs** should avoid sensitive content (no real card data or PII). Log request IDs, operation names, and error categories only.
*   **Access logs** (ALB/API) and **Cloud logs** can be used to spot 401/404 spikes, TLS errors, and routing failures.
*   **Health strategy:** There is no dedicated health route documented; treat **WSDL fetch + mock UI fetch + deployed integration tests** as the composite health signal.

***

## 8) Change Management & Releases (Security‑Relevant)

*   **Artifacts**: When updating WSDL/XSD/HTML, publish to S3 under controlled roles; validate integrity (optionally keep checksums) and re‑run integration tests.
*   **App releases**: The repo uses **Changesets** for npm publishing; verify that any change affecting auth, artifact paths, or domain config is called out in release notes and tested in the deployed environment.

***

## 9) Reporting Vulnerabilities

*   **Where to report:** Use the organization’s standard vulnerability reporting channel (security@… or internal ticketing).
*   **What to include:** affected endpoint/URL, reproduction steps (omit secrets), timestamps, and logs with PII removed.

***

## 10) References

*   **USTC Pay.gov Dev Server (repo README):** environment variables, required artifacts, commands, dev custom domain. [USTC Pay Test server](https://github.com/ustaxcourt/ustc-pay-gov-test-server)
*   **Pay.gov Web Services Technical Overview (official):** authoritative reference for real Pay.gov service semantics and considerations. [Web Services Technical Overview](https://imlive.s3.amazonaws.com/Federal%20Government/ID82112911311871723120403732303947743906/ESM%20RFI_Attachment%204_Pay.Gov%20Technical%20Overview.pdf)
