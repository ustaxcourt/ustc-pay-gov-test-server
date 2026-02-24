# USTC Pay.gov Dev Server — Mock SOAP API

> **Purpose.** This document describes the mocked **Hosted Collection Pages** SOAP interface exposed by the USTC Pay.gov Dev Server for development and integration testing. It mirrors the operations USTC uses with Pay.gov (not an exhaustive Pay.gov implementation) and serves the WSDL/XSD artifacts required by clients. This service is for **dev/test only** and does **not** process real payments. 

---

## 1) Base URLs & Artifacts

- **Dev base URL:** `https://pay-gov-dev.ustaxcourt.gov` (custom domain for the deployed dev instance). 
- **Artifacts served by this service (required for SOAP clients):**
  - `https://pay-gov-dev.ustaxcourt.gov/wsdl/TCSOnlineService_3_1.wsdl`
  - `https://pay-gov-dev.ustaxcourt.gov/wsdl/TCSOnlineService_3_1.xsd`
  - `https://pay-gov-dev.ustaxcourt.gov/wsdl/tcs_common_types.xsd`  
  In **production mode**, these are read from S3 (local mode reads from filesystem). 

> For authoritative semantics and field definitions used by Pay.gov’s web services, reference the **Pay.gov Web Services Technical Overview** (maps conceptually to the HCP/Hosted Collection Pages flow this mock emulates). 

---

## 2) Authentication

All SOAP requests to the Dev Server must include a bearer token:

```
Authentication: Bearer \<ACCESS\_TOKEN>
```

- The value is set as an environment variable on the server and corresponds to `.env/.env.prod` during dev/testing. Requests missing or using the wrong token will receive **401 Unauthorized**. 

---

## 3) Operations

This service focuses on the two operations the USTC Payment Portal relies on during development:

1. **`startOnlineCollection`** — Initiates a transaction and returns a **token** + **redirect URL** for the client to send the user to a payment page (mocked UI).   
2. **`completeOnlineCollection`** — Completes the transaction using the **token** and returns a **tracking ID** (mock). 

> The Payment Portal (dev) is configured to call this Dev Server and then redirect the user to a **mock UI** (`/html/pay.html`) which provides **Complete**/**Cancel** buttons and then redirects to the **success/cancel URLs** given during initiation. 

---

## 4) Example Messages

The following example SOAP envelopes illustrate the expected shapes for the mocked endpoints. Names and structures are aligned with the resources the Dev Server serves (WSDL/XSD above) for developer realism. Always consult the WSDL your client consumes from this service to generate bindings and validate messages. 

### 4.1 `startOnlineCollection` — Request

```xml
<!-- POST https://pay-gov-dev.ustaxcourt.gov/soap (example endpoint),
     with header: Authentication: Bearer <ACCESS_TOKEN> -->
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tcs="http://pay.gov/tcs/online/services/v3_1">
  <soapenv:Header/>
  <soapenv:Body>
    <tcs:startOnlineCollectionRequest>
      <tcs:applicationId>USTC-PORTAL-DEV</tcs:applicationId>
      <tcs:transaction>
        <tcs:amount>75.00</tcs:amount>
        <tcs:currency>USD</tcs:currency>
        <tcs:referenceNumber>CASE-2026-000123</tcs:referenceNumber>
        <tcs:successURL>https://app.dev.ustc.gov/pay/success</tcs:successURL>
        <tcs:cancelURL>https://app.dev.ustc.gov/pay/cancel</tcs:cancelURL>
      </tcs:transaction>
      <!-- Additional fields as allowed by the served XSD -->
    </tcs:startOnlineCollectionRequest>
  </soapenv:Body>
</soapenv:Envelope>
````

**Response**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tcs="http://pay.gov/tcs/online/services/v3_1">
  <soapenv:Header/>
  <soapenv:Body>
    <tcs:startOnlineCollectionResponse>
      <tcs:token>DEV-ABC123TOKEN</tcs:token>
      <tcs:redirectURL>https://pay-gov-dev.ustaxcourt.gov/html/pay.html?token=DEV-ABC123TOKEN</tcs:redirectURL>
      <tcs:status>SUCCESS</tcs:status>
    </tcs:startOnlineCollectionResponse>
  </soapenv:Body>
</soapenv:Envelope>
```

> The **redirectURL** points to the Dev Server’s **mock UI** (`/html/pay.html`). The user chooses **Complete** or **Cancel**, and the mock page redirects back to the app’s `successURL` or `cancelURL` provided in the initiation request.

***

### 4.2 `completeOnlineCollection` — Request

```xml
<!-- POST https://pay-gov-dev.ustaxcourt.gov/soap (example endpoint),
     with header: Authentication: Bearer <ACCESS_TOKEN> -->
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tcs="http://pay.gov/tcs/online/services/v3_1">
  <soapenv:Header/>
  <soapenv:Body>
    <tcs:completeOnlineCollectionRequest>
      <tcs:token>DEV-ABC123TOKEN</tcs:token>
    </tcs:completeOnlineCollectionRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

**Response**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tcs="http://pay.gov/tcs/online/services/v3_1">
  <soapenv:Header/>
  <soapenv:Body>
    <tcs:completeOnlineCollectionResponse>
      <tcs:trackingId>MOCK-TRACKING-78901</tcs:trackingId>
      <tcs:status>SUCCESS</tcs:status>
    </tcs:completeOnlineCollectionResponse>
  </soapenv:Body>
</soapenv:Envelope>
```

*   In the current implementation, transactions are treated as **successful** by default (see “Simulated Outcomes” below for planned extensibility).

***

## 5) SOAP Endpoint Details

*   **Endpoint path:** The concrete SOAP path is defined by the service and may be behind the same base as artifacts. Use the **served WSDL** to generate the client and resolve the final SOAP address.
*   **Contracts:** Always fetch the WSDL/XSD from this service to ensure your client bindings match the mock’s expectations. (See §1 for artifact URLs.)
*   **Auth header:** `Authentication: Bearer <ACCESS_TOKEN>` required for SOAP requests; otherwise **401**.

> Looking for Pay.gov’s canonical field meanings and return codes? Use the official Web Services Technical Overview to map mocked fields to real semantics during design. [Web Services Technical Overview](https://imlive.s3.amazonaws.com/Federal%20Government/ID82112911311871723120403732303947743906/ESM%20RFI_Attachment%204_Pay.Gov%20Technical%20Overview.pdf)

***

## 6) Simulated Outcomes (Roadmap)

The repo tracks issues to add explicit triggers for **pending** and **failed** outcomes (e.g., via special amounts, query params, or headers) to make negative‑path testing easy. Once implemented, we will document the controls here—for example:

*   **Force Pending:** set `Amount=0.01` → respond with `PENDING`.
*   **Force Failure:** add header `X-Mock-Outcome: fail` → respond with `FAILED` and a mock code.

(These are **examples only**—refer to the repo issues and release notes for final controls once implemented.) [USTC Pay Test server Issues](https://github.com/ustaxcourt/ustc-pay-gov-test-server/issues)

***

## 7) Error Handling & Status

*   **401 Unauthorized:** Missing or invalid bearer token; check that clients send the correct `ACCESS_TOKEN`.
*   **4xx/5xx:** Malformed SOAP envelope or missing artifacts (e.g., WSDL/XSD not present in S3 for the deployed environment) may surface as errors; validate artifact availability and use the **deployed integration tests** to localize.

***

## 8) Integration Testing

The repository provides commands to run **integration tests** against a running instance:

*   **Local integration tests:** start the dev server and run `npm run test:integration`.
*   **Deployed (prod) integration tests:** ensure `.env.prod` is populated, then run:
    ```bash
    npm run test:integration:prod
    ```
    These tests validate that the deployed server correctly serves artifacts and handles SOAP/REST interactions as expected.

***

## 9) Related Documents

*   **Project README** (env vars, artifacts, commands, domain) — GitHub: <https://github.com/ustaxcourt/ustc-pay-gov-test-server> [USTC Pay Test server](https://github.com/ustaxcourt/ustc-pay-gov-test-server)
*   **Payment Portal** (consumer; workflow details & compatibility) — GitHub: <https://github.com/ustaxcourt/ustc-payment-portal/> [USTC Pay Payment Portal](https://github.com/ustaxcourt/ustc-payment-portal/)
*   **Pay.gov Web Services Technical Overview** — PDF: [Web Services Technical Overview](https://imlive.s3.amazonaws.com/Federal%20Government/ID82112911311871723120403732303947743906/ESM%20RFI_Attachment%204_Pay.Gov%20Technical%20Overview.pdf)
