# USTC Pay.gov Dev Server — Terraform Deploy Guide

> **Scope.** This guide explains how to deploy and operate the **USTC Pay.gov Dev Server** using Terraform: required variables, backends/workspaces, secrets handling, DNS & TLS (ACM), and post‑deploy validation. The deployed dev instance is published at **`https://pay-gov-dev.ustaxcourt.gov`** and serves SOAP, REST, and static artifacts (WSDL/XSD/HTML).

---

## 1) Repository Layout (relevant to deploy)

- **App**: TypeScript/Express service (SOAP handlers + REST + static) requiring `Authentication: Bearer <ACCESS_TOKEN>`.   
- **Static artifacts** (required at runtime in prod mode):  
  - `html/pay.html`  
  - `wsdl/TCSOnlineService_3_1.wsdl`  
  - `wsdl/TCSOnlineService_3_1.xsd`  
  - `wsdl/tcs_common_types.xsd`   
- **Dev domain**: `https://pay-gov-dev.ustaxcourt.gov` (custom domain fronting the service).   
- The README indicates Terraform is used as the IaC entry point and references environment variables used by the application. 

---

## 2) Prerequisites

- **Terraform** v1.x installed locally or a CI runner with Terraform.  
- **AWS account**: `ent-apps-pay-gov-workloads-dev` (dev). The app README states this is the deployment target for the dev environment.   
- **Hosted zone** in Route 53 for `ustaxcourt.gov` (or delegated subzone) and permissions to create records for `pay-gov-dev.ustaxcourt.gov`.   
- **Access to store secrets** (e.g., SSM Parameter Store or Secrets Manager) for `ACCESS_TOKEN`. The server validates the header `Authentication: Bearer <ACCESS_TOKEN>`. 

---

## 3) Terraform Backend & Workspaces

Organize state per environment. A common pattern:

```hcl
# backend.hcl (example for S3 backend)
bucket         = "ustc-pay-gov-test-server-tfstate-dev"
key            = "infrastructure/dev/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "ustc-pay-gov-test-server-tf-locks"
encrypt        = true
```

Initialize with:

```bash
terraform init -backend-config=backend.hcl
terraform workspace new dev || terraform workspace select dev
```

> Use separate workspaces (or separate state files) for `dev` vs any future environments. The repo points to a **dev** AWS account for this service.

***

## 4) Required Variables

Define the following inputs (adjust names to your module layout). Values mirror the app’s env needs and infra resources described in the README:

| Variable                      | Purpose                                                                                                                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `service_name`                | Logical name for tagging and resource naming.                                                                                                                                                                                                                                        |
| `domain_name`                 | `pay-gov-dev.ustaxcourt.gov` (custom domain for the dev instance).                                                                                                            |
| `hosted_zone_id`              | Route 53 hosted zone ID where the record will be created.                                                                                                                                                                                                                            |
| `artifact_bucket`             | **S3 bucket** that will host `html/` and `wsdl/` artifacts for production mode. The README lists required files but not the bucket name; standardize and document this value. |
| `access_token_parameter_name` | SSM/Secrets Manager path containing the `ACCESS_TOKEN`. The server requires the header `Authentication: Bearer <ACCESS_TOKEN>`.                                               |
| `base_url`                    | `https://pay-gov-dev.ustaxcourt.gov` (used by tests/integration settings).                                                                                                    |
| `environment`                 | `dev`                                                                                                                                                                                                                                                                                |
| `logging_retention_days`      | Cloud log retention policy per your standards.                                                                                                                                                                                                                                       |

***

## 5) High‑Level Terraform Topology

Typical resources you’ll define (actual service shape may be Lambda/API Gateway or container/ALB—align with your existing stack):

1.  **Compute + App runtime** (e.g., Lambda with API Gateway HTTP API or ECS/Fargate behind an ALB).
2.  **S3 bucket** for artifacts: `html/` and `wsdl/` content (publicly readable via the app or served through the app). The app’s production mode expects artifacts in S3.
3.  **ACM certificate** for `pay-gov-dev.ustaxcourt.gov` (in the same region as the load balancer/API endpoint).
4.  **Route 53 record** `A/AAAA` (or `CNAME`) pointing the custom domain to the ALB/API Gateway.
5.  **Parameters/Secrets** for `ACCESS_TOKEN` and any other sensitive config.
6.  **IAM roles/policies** granting the app **read** access to the artifact bucket and parameters.

***

## 6) Secrets & Environment Injection

*   Store `ACCESS_TOKEN` in **SSM Parameter Store** (SecureString) or **Secrets Manager**.
*   Inject into the runtime as an environment variable so the service can validate requests via `Authentication: Bearer <ACCESS_TOKEN>`.
*   Keep `.env.prod` in the repo **only** for local testing of the deployed instance (never commit secrets). The README references `.env` and `.env.prod` for env management and tests.

***

## 7) Building & Deploying (example workflow)

> **Note:** Align these steps with your CI (GitHub Actions/Azure DevOps/etc.). The project is published to npm and uses **Changesets** for versioning, but the infra deployment targets the dev AWS account noted in the README.

### 7.1 Manual (local) apply

```bash
# 1) Initialize backend and select workspace
terraform init -backend-config=backend.hcl
terraform workspace select dev

# 2) Plan (provide required variables)
terraform plan \
  -var="service_name=ustc-pay-gov-test-server" \
  -var="domain_name=pay-gov-dev.ustaxcourt.gov" \
  -var="hosted_zone_id=Z123EXAMPLE" \
  -var="artifact_bucket=ustc-pay-gov-test-server-artifacts-dev" \
  -var="access_token_parameter_name=/ustc/paygov-dev/access_token" \
  -var="base_url=https://pay-gov-dev.ustaxcourt.gov" \
  -var="environment=dev"

# 3) Apply
terraform apply \
  -var="service_name=ustc-pay-gov-test-server" \
  -var="domain_name=pay-gov-dev.ustaxcourt.gov" \
  -var="hosted_zone_id=Z123EXAMPLE" \
  -var="artifact_bucket=ustc-pay-gov-test-server-artifacts-dev" \
  -var="access_token_parameter_name=/ustc/paygov-dev/access_token" \
  -var="base_url=https://pay-gov-dev.ustaxcourt.gov" \
  -var="environment=dev"
```

### 7.2 CI pipeline outline

1.  **Lint/validate** Terraform.
2.  **`terraform init`** with remote state, select `dev`.
3.  **`terraform plan`** with environment variables pulled from your CI secret store.
4.  **Manual approval** step (optional).
5.  **`terraform apply`** on `dev`.

***

## 8) DNS & TLS (ACM) for `pay-gov-dev.ustaxcourt.gov`

1.  **Request an ACM certificate** for `pay-gov-dev.ustaxcourt.gov` (public, DNS validation).
2.  **Create validation CNAME** records in Route 53 (ACM provides them).
3.  **Attach the certificate** to your ALB or API Gateway endpoint.
4.  **Create Route 53 record** (A/AAAA alias to ALB or API GW) for `pay-gov-dev.ustaxcourt.gov`.
5.  Verify that `https://pay-gov-dev.ustaxcourt.gov` answers and serves your app. The README cites this domain as the configured custom name for the dev server.

***

## 9) Upload Required Artifacts to S3

After infra is up, upload the required files so the service can serve them in production mode:

    html/pay.html
    wsdl/TCSOnlineService_3_1.wsdl
    wsdl/TCSOnlineService_3_1.xsd
    wsdl/tcs_common_types.xsd

*   The README explicitly lists these files as required for the deployed service. Ensure they exist in the **artifact bucket** and are readable by the app.
*   Consider enabling S3 **versioning** and publishing **checksums** (SHA‑256) for traceability during updates.

***

## 10) Post‑Deploy Verification (SOP)

1.  **Fetch WSDL** (expect **200**):
    ```bash
    curl -I https://pay-gov-dev.ustaxcourt.gov/wsdl/TCSOnlineService_3_1.wsdl
    ```
    
2.  **Fetch Mock UI** (expect **200**):
    ```bash
    curl -I https://pay-gov-dev.ustaxcourt.gov/html/pay.html
    ```
    
3.  **Run deployed integration tests** (from repo; requires `.env.prod`):
    ```bash
    npm run test:integration:prod
    ```
    The README provides this command for validating the production (deployed dev) instance.

***

## 11) Token Rotation

*   **Where:** Stored in parameter/secret store; injected as `ACCESS_TOKEN`.
*   **Clients:** Payment Portal (dev) and any test harness must update the header to the new value:
        Authentication: Bearer <ACCESS_TOKEN>
    The server will return **401** if the token is missing or invalid. This behavior and header format are documented in the repo README.
*   After rotation, repeat **Post‑Deploy Verification**.

***

## 12) Rollback

*   **Infra rollback:** `terraform apply` with the previous state or revert the last change set.
*   **Artifact rollback:** restore prior **S3 object versions** for `html/` and `wsdl/` keys.
*   **Token rollback:** re‑set the previous token in the parameter store if clients haven’t switched, then re‑verify.

***

## 13) References

*   **USTC Pay.gov Dev Server (repo README):** environment variables, required artifacts, commands, and the dev custom domain. [USTC Pay Test server Terraform](https://github.com/ustaxcourt/ustc-pay-gov-test-server/blob/main/terraform/README.md)
*   **Terraform folder placeholder:** the repo mentions Terraform and suggests IaC docs should live here—use this guide as `/docs/deploy/terraform.md` or mirror it at `/terraform/README.md`. [USTC Pay Test server Terraform](https://github.com/ustaxcourt/ustc-pay-gov-test-server/blob/main/terraform/README.md)
*   **Payment Portal (consumer)** for cross‑validation and compatibility notes. [USTC Payment Portal](https://github.com/ustaxcourt/ustc-payment-portal/)
