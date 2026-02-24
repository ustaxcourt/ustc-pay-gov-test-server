# USTC Pay.gov Dev Server — Compatibility Matrix

This document tracks **known‑good version pairs** between:

- **USTC Pay.gov Dev Server**  
  (USTC Payment Test Server repo) 
- **USTC Payment Portal**  
  (USTC Payment Portal repo) 

These two systems are tightly coupled:  
the Payment Portal depends on this Dev Server for **mock SOAP**, **REST**, and **redirect‑based payment flows**.  
Any change to request/response shapes, error behavior, or artifacts (WSDL/XSD/HTML) may impact compatibility.

This file ensures teams know which combinations are validated and safe to run together.

---

## 1. Why Compatibility Tracking Matters

- The Payment Portal relies on this Dev Server for:
  - `startOnlineCollection` → token + redirect URL (mock Pay.gov). 
  - `completeOnlineCollection` → returns a tracking ID. 
  - Rendering the mock pay page (`html/pay.html`) used for Complete/Cancel flows. 

- The Dev Server:
  - Serves WSDL/XSD files the Portal consumes.  
  - Requires a bearer token (`Authentication: Bearer <ACCESS_TOKEN>`).  
  - Behaves differently depending on environment (`local` vs `production` → filesystem vs S3). 

- The Payment Portal codebase is actively maintained and updated.  
  - New workflows (e.g., changes in future v2 flow) are being developed. 

Because of this coupling, maintaining a **version matrix** prevents accidental breakage.

---

## 2. Compatibility Table

Populate this table **whenever either repo updates behavior** that could affect the other (SOAP/REST contracts, redirect patterns, artifacts, testing utilities, etc.).

> **Tip**: Update this table as part of the release checklist in `/docs/release.md`.

| Dev Server Version | Payment Portal Version | Status | Notes |
|---|---|---|---|
| _example_ `v1.0.0` | _example_ `v3.5.2` | ✅ Compatible | Verified via deployed integration tests and Portal local E2E. |
| _example_ `v1.1.0` | _example_ `v3.6.0` | ⚠️ Partial | Redirect parameters changed; Portal needs patch. |
| _example_ `v1.2.0` | _example_ `v3.6.1` | ✅ Compatible | Post‑fix verification completed with both repos. |

Add rows as the system evolves.

---

## 3. Compatibility Testing Procedure

Whenever a new Dev Server release is prepared (see `/docs/release.md`):

### 3.1 Validate Against Deployed Dev Server
1. Update `.env.prod` locally:
   ```env
   BASE_URL=https://pay-gov-dev.ustaxcourt.gov
   ACCESS_TOKEN=<current-token>
   ```

2.  Run:
    ```bash
    npm run test:integration:prod
    ```
    This ensures SOAP/REST behavior remains correct and artifacts resolve.  
    (Tests documented by the USTC Payment Test Server repo.)

### 3.2 Validate Using Payment Portal (Dev)

Clone or update the **USTC Payment Portal repo**:  
<https://github.com/ustaxcourt/ustc-payment-portal> [USTC Payment Portal](https://github.com/ustaxcourt/ustc-payment-portal/)

Run Portal:

*   Local E2E tests
*   Dev integration pointing at the Dev Server’s `BASE_URL` + correct `ACCESS_TOKEN`

Validate:

*   `startOnlineCollection` returns expected token + redirect URL.
*   Redirecting to `/html/pay.html` then back to the Portal’s `successURL`/`cancelURL` works.
*   `completeOnlineCollection` returns the Portal‑expected fields.

### 3.3 Validate New or Changing Flows

The Payment Portal repo documents evolving workflows (including new v2 flow-in-progress).  
If your changes affect flow semantics, confirm the Portal’s future‑workflow branch remains functional.  
(Until finalized, mark compatibility as ⚠️ Partial.)

***

## 4. Behavioral Areas to Check After Each Release

### 4.1 SOAP Contract Stability

*   Ensure the served WSDL/XSD files still match Payment Portal expectations.
*   If schemas change, coordinate Portal updates and bump versions accordingly.

### 4.2 REST Behavior

*   Confirm the Portal’s REST calls match expected request/response shapes.
*   REST path changes or authentication changes must be documented.

### 4.3 Environment Behavior

*   Portal dev environment must authenticate successfully via  
    `Authentication: Bearer <ACCESS_TOKEN>`
*   Local and deployed modes must both operate correctly (filesystem vs S3 artifacts).  
    (Documented in the USTC Payment Test Server repo README.)

### 4.4 Mock UI Behavior

*   Confirm redirect flow: Portal → Dev Server → mock UI → success/cancel URL → Portal → Dev Server.
*   If mock UI parameters change, compatibility must be re‑certified.

***

## 5. Compatibility Change Template

Whenever a new compatibility entry is added, include:

    ### <Date> — Version Pair Validation

    **Dev Server version:** vX.Y.Z  
    **Payment Portal version:** vA.B.C  
    **Status:** (Compatible / Partial / Incompatible)

    **Tested:**
    - Deployed integration tests on Dev Server ✔
    - Payment Portal dev integration ✔
    - Redirect flows (mock UI) ✔/✖
    - SOAP operations (`startOnlineCollection`, `completeOnlineCollection`) ✔/✖
    - REST endpoints ✔/✖

    **Notes:**
    - (Anything relevant: schema changes, artifacts updated, retry logic, token rotation considerations, etc.)

    **Action Items:**
    - (e.g., Portal patch required, document updates, artifact version bumps)

***

## 6. References

*   **USTC Payment Test Server repo** (this service) [USTC Pay Test server](https://github.com/ustaxcourt/ustc-pay-gov-test-server)

*   **USTC Payment Portal repo** (consumer) [USTC Payment Portal](https://github.com/ustaxcourt/ustc-payment-portal/)

***

This compatibility file should be updated **with every significant release**, especially when touching:

*   SOAP behavior
*   REST API structure
*   Redirect logic
*   WSDL/XSD artifacts
*   Authentication changes
*   Dev environment token rotations
