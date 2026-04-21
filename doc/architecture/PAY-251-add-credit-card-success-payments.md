# PAY-251: Credit Card Success Payments - Implementation Plan

## Objective

Confirm and document the end-to-end Credit Card success flow so selecting:

```html
<p>
  <a
    href="%%urlSuccess%%"
    data-payment-method="PLASTIC_CARD"
    data-payment-status="Success"
    >Complete Payment (Credit Card - Success)</a
  >
</p>
```

results in a successful payment path and a final transaction status of `Success`.

> Convention: We are not changing production behavior for PAY-251 unless a gap is found. This ticket is primarily verification plus regression coverage.

## Change Type Notice

This is **not** a contract-breaking change. The existing endpoint contracts remain the same.

What changes in PAY-251:

- Add explicit verification artifacts (documentation and tests)
- Strengthen regression coverage for `PLASTIC_CARD` + `Success`
- Add missing deployment work for Lambda, API Gateway, GitHub Actions, and S3-backed static assets

What does not change:

- API payload shape
- Persistence schema
- Infrastructure

---

## Key Distinction: Marking vs Resolved Status

| Concept                             | Scope                                 | Values                                               |
| ----------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| `paymentStatus` request param       | User action from test pay page        | `Success` or `Failed`                                |
| `transaction_status` response value | Derived result from transaction state | `Success`, `Failed`, or `Received` (ACH timing case) |

Resolution behavior used by `getDetails`:

- If ACH was initiated very recently, status can be `Received`
- Otherwise, if `failed_payment` is true, status is `Failed`
- Otherwise, status is `Success`

For `PLASTIC_CARD` + `Success`, we expect no ACH timing branch and no failed flag, so the resolved status is `Success`.

---

## End-to-End Flow Reference

1. User clicks Credit Card success link on pay page
2. Browser script posts to `/pay/PLASTIC_CARD/Success?token=...`
3. `markPaymentStatusLambda` validates token, method, and status
4. `handleMarkPaymentStatus` persists `payment_type: "PLASTIC_CARD"` without `failed_payment`
5. Response returns `redirectUrl` (from `url_success`)
6. Later `getDetails` resolves final `transaction_status` to `Success`

---

## Implementation Plan

This section is the code-level implementation plan for the ticket. Each subsection lists the file to edit, the approximate line to start from, and the concrete code shape to add or verify.

### 1. Confirm the pay page entry already exists

File and line target:

- `src/static/html/pay.html` around line `17`

Code to verify:

```html
<p>
  <a
    href="%%urlSuccess%%"
    data-payment-method="PLASTIC_CARD"
    data-payment-status="Success"
    >Complete Payment (Credit Card - Success)</a
  >
</p>
```

Implementation note:

- No code change is required here unless the anchor text or data attributes drifted.

### 2. Confirm the browser posts to the mark-payment endpoint

File and line target:

- `src/static/html/scripts/override-links.js` around the `fetch(`/pay/...`)` call

Code to verify:

```javascript
const response = await fetch(
  `/pay/${encodeURIComponent(method)}/${encodeURIComponent(
    status,
  )}?token=${encodeURIComponent(token)}`,
  { method: "POST" },
);
```

Implementation note:

- No code change is required here if the existing click handler already posts `PLASTIC_CARD` and `Success` correctly.

### 3. Confirm the local application route and backend status behavior

Files and line targets:

- `src/app.ts` around line `38`
- `src/lambdas/markPaymentStatusLambda.ts` around line `6`
- `src/useCases/handleMarkPaymentStatus.ts` at the `updatedTransaction` assignment
- `src/useCaseHelpers/resolveTransactionStatus.ts` at the final return

Code to verify in `src/app.ts`:

```ts
app.post("/pay/:paymentMethod/:paymentStatus", markPaymentStatusLambda);
```

Code to verify in `src/lambdas/markPaymentStatusLambda.ts`:

```ts
if (!isPaymentType(paymentMethod)) {
  throw new InvalidRequestError(`Invalid payment method: ${paymentMethod}`);
}

if (!isMarkablePaymentStatus(paymentStatus)) {
  throw new InvalidRequestError(`Invalid payment status: ${paymentStatus}`);
}
```

Implementation note:

- For `PLASTIC_CARD` + `Success`, the transaction should persist `payment_type: "PLASTIC_CARD"` without `failed_payment`, and `resolveTransactionStatus` should ultimately return `Success`.

### 4. Add deployed Lambda support for the pay-page flow

Files and line targets:

- `terraform/modules/lambda/lambda.tf` starting near line `26` for archive blocks
- `terraform/modules/lambda/lambda.tf` starting near line `91` for function resources
- `src/lambdas/getPayPageLambda.ts` around line `17` already has an AWS handler
- `src/lambdas/getScriptLambda.ts` currently only exposes `getScriptLocal` around line `53`
- `src/lambdas/markPaymentStatusLambda.ts` currently only exposes the Express handler around line `6`

Implementation changes:

1. Add archive blocks and `aws_lambda_function` resources for:
   - `getScriptLambda`
   - `markPaymentStatusLambda`
2. Add matching CloudWatch log groups.
3. Add AWS Lambda handlers in source files if the handler export does not exist yet.

Code shape to add in Terraform:

```hcl
data "archive_file" "lambda_script_zip" {
  type        = "zip"
  output_path = "${path.root}/lambda-script-deployment.zip"

  source {
    content  = file("${path.root}/lambda-script-bundled.js")
    filename = "src/lambdas/getScriptLambda.js"
  }
}
```

```hcl
data "archive_file" "lambda_mark_payment_status_zip" {
  type        = "zip"
  output_path = "${path.root}/lambda-mark-payment-status-deployment.zip"

  source {
    content  = file("${path.root}/lambda-mark-payment-status-bundled.js")
    filename = "src/lambdas/markPaymentStatusLambda.js"
  }
}
```

### 5. Expose the missing deployed endpoints in API Gateway

File and line target:

- `terraform/modules/api-gateway/api-gateway.tf` starting near line `29`
- `terraform/modules/api-gateway/api-gateway.tf` starting near line `89`

Implementation changes:

1. Add API Gateway resources for:
   - `/scripts`
   - `/scripts/{file}`
   - `/pay/{paymentMethod}`
   - `/pay/{paymentMethod}/{paymentStatus}`
2. Add methods/integrations for:
   - `GET /scripts/{file}`
   - `POST /pay/{paymentMethod}/{paymentStatus}`
3. Update deployment dependencies and redeployment triggers.

Code shape to add:

```hcl
resource "aws_api_gateway_method" "mark_payment_status_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.pay_payment_status.id
  http_method   = "POST"
  authorization = "NONE"
}
```

```hcl
resource "aws_api_gateway_integration" "mark_payment_status_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.pay_payment_status.id
  http_method             = aws_api_gateway_method.mark_payment_status_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.mark_payment_status_invoke_arn
}
```

### 6. Update the deployment workflow to upload static assets

File and line target:

- `.github/workflows/deploy.yml` after `Terraform apply` around line `98`

Implementation changes:

1. Keep the existing build and Terraform apply steps.
2. Add an S3 upload step after apply for:
   - `terraform/static/html/pay.html`
   - `terraform/static/html/scripts/override-links.js`

Code shape to add:

```yaml
- name: Upload pay page static assets
  run: |
    aws s3 cp terraform/static/html/pay.html s3://dev-ustc-pay-gov-test-server/html/pay.html
    aws s3 cp terraform/static/html/scripts/override-links.js s3://dev-ustc-pay-gov-test-server/html/scripts/override-links.js
```

### 7. Add an explicit PLASTIC_CARD success test

Files and line targets:

- `test/integration/transaction-http.test.ts` after the existing success test near line `204`
- `src/lambdas/markPaymentStatusLambda.test.ts` after the valid request test near line `106` if unit-level coverage is also desired

Implementation change made in this branch:

- Added an integration test that explicitly marks the token with `PLASTIC_CARD` + `Success` and then asserts the completed transaction returns `transaction_status: "Success"` and `payment_type: "PLASTIC_CARD"`.

Code added in `test/integration/transaction-http.test.ts`:

```ts
it("should process a successful PLASTIC_CARD transaction when token is explicitly marked success", async () => {
  const { token, agencyTrackingId } = await startOnlineCollection(amount);

  const markSuccessResponse = await markPaymentStatus(
    token,
    "PLASTIC_CARD",
    "Success",
  );
  expect(markSuccessResponse.status).toBe(200);

  const trackingResponse = await completeOnlineCollectionWithDetails(token);

  expect(trackingResponse.transaction_status).toBe("Success");
  expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
  expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
});
```

If you also want the unit test, add it here:

- `src/lambdas/markPaymentStatusLambda.test.ts` after the existing valid request test near line `106`

### 8. Validation commands

Run these after implementation:

```bash
npm test -- --runInBand src/useCases/showPayPage.test.ts src/useCases/handleMarkPaymentStatus.test.ts src/lambdas/markPaymentStatusLambda.test.ts src/useCases/handleGetDetails.test.ts
```

```bash
NODE_ENV=local jest --runInBand test/integration/transaction-http.test.ts
```

---

## Code Change Summary By Section

| Section                       | Files to Review                                                                                                                                     | Expected Edit                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1. Pay page entry             | `src/static/html/pay.html`                                                                                                                          | Usually none                                                     |
| 2. Browser routing            | `src/static/html/scripts/override-links.js`                                                                                                         | Usually none                                                     |
| 3. Lambda/use case path       | `src/app.ts`, `src/lambdas/markPaymentStatusLambda.ts`, `src/useCases/handleMarkPaymentStatus.ts`, `src/useCaseHelpers/resolveTransactionStatus.ts` | Usually none in app logic                                        |
| 4. Terraform Lambda packaging | `terraform/modules/lambda/lambda.tf`, `src/lambdas/getPayPageLambda.ts`, `src/lambdas/getScriptLambda.ts`, `src/lambdas/markPaymentStatusLambda.ts` | Add or extend deployed Lambda support                            |
| 5. API Gateway exposure       | `terraform/modules/api-gateway/api-gateway.tf`                                                                                                      | Add `/scripts/{file}` and `/pay/{paymentMethod}/{paymentStatus}` |
| 6. Regression coverage        | `src/lambdas/markPaymentStatusLambda.test.ts`                                                                                                       | Add explicit success test if missing                             |
| 7. GitHub Actions deploy      | `.github/workflows/deploy.yml`                                                                                                                      | Add S3 static asset deployment step                              |
| 8. Validation                 | test command only                                                                                                                                   | No code edit                                                     |

---

## Deployment Runbook (Lambda + Terraform Static Files)

This rollout must deploy both Lambda code and static files used by the pay page flow.

### Pre-deploy checks

1. Confirm source static files contain PAY-251 behavior:

- `src/static/html/pay.html` includes `Complete Payment (Credit Card - Success)` with:
  - `data-payment-method="PLASTIC_CARD"`
  - `data-payment-status="Success"`
- `src/static/html/scripts/override-links.js` posts to `/pay/:paymentMethod/:paymentStatus?token=...`
- `terraform/modules/lambda/lambda.tf` includes deployed Lambda resources for:
  - `src/lambdas/getPayPageLambda.ts`
  - `src/lambdas/getScriptLambda.ts`
  - `src/lambdas/markPaymentStatusLambda.ts`
- `terraform/modules/api-gateway/api-gateway.tf` includes deployed routes for:
  - `GET /pay`
  - `GET /scripts/{file}`
  - `POST /pay/{paymentMethod}/{paymentStatus}`
- `.github/workflows/deploy.yml` includes static asset upload after infrastructure deploy

2. Confirm tests are green:

```bash
npm test -- --runInBand src/useCases/showPayPage.test.ts src/useCases/handleMarkPaymentStatus.test.ts src/lambdas/markPaymentStatusLambda.test.ts src/useCases/handleGetDetails.test.ts
```

### Package Lambda + static artifacts

From repo root:

```bash
cd terraform
./build.sh
```

Expected build outputs:

- Lambda bundles:
  - `terraform/lambda-soap-api-bundled.js`
  - `terraform/lambda-resource-bundled.js`
  - `terraform/lambda-pay-page-bundled.js`
  - bundled artifact for `src/lambdas/getScriptLambda.ts`
  - bundled artifact for `src/lambdas/markPaymentStatusLambda.ts`
- Terraform static copies:
  - `terraform/static/html/pay.html`
  - `terraform/static/html/scripts/override-links.js`

### Deploy Lambda and infrastructure changes

```bash
cd terraform
./deploy.sh dev
```

Notes:

- `deploy.sh` runs `build.sh`, then `terraform plan` and `terraform apply`
- This should update Lambda packages and API Gateway wiring for:
  - `GET /pay`
  - `GET /scripts/{file}`
  - `POST /pay/{paymentMethod}/{paymentStatus}`

### Upload static files to S3 (required)

The deployed runtime reads static files from S3 (`NODE_ENV=development` uses `getFileS3`), so static content must be synced after changes.

Option A: existing project script (dev bucket)

```bash
npm run copy-files
```

Option B: explicit upload command

```bash
aws s3 cp src/static s3://dev-ustc-pay-gov-test-server --recursive
```

Minimum required objects for this feature:

- `html/pay.html`
- `html/scripts/override-links.js`

Workflow requirement:

- `.github/workflows/deploy.yml` should perform this upload automatically so Lambda deployment and static asset deployment stay in sync

### Post-deploy verification: Credit Card Success flow

1. Open pay page with a valid token:

- `GET /pay?token=<token>`

2. On the page, click:

- `Complete Payment (Credit Card - Success)`

3. Verify network call:

- `POST /pay/PLASTIC_CARD/Success?token=<token>` returns `200` with `{ redirectUrl }`

4. Verify resulting details flow:

- downstream `getDetails` resolves transaction status to `Success`

5. Quick smoke checks for static serving:

- `GET /pay?token=<token>` returns HTML containing `Complete Payment (Credit Card - Success)`
- `GET /scripts/override-links.js` returns JavaScript with POST logic

### Rollback guidance

If regression is detected:

1. Re-deploy previous Lambda artifact revision
2. Re-upload previous versions of:

- `html/pay.html`
- `html/scripts/override-links.js`

3. Re-run post-deploy verification steps above

---

## Files Touched (PAY-251)

| File                                                           | Action                                              | Status     |
| -------------------------------------------------------------- | --------------------------------------------------- | ---------- |
| `src/lambdas/markPaymentStatusLambda.test.ts`                  | Add explicit `PLASTIC_CARD` + `Success` lambda test | Done       |
| `doc/architecture/PAY-251-add-credit-card-success-payments.md` | Reformat and document verified plan/evidence        | Done       |
| `terraform/modules/lambda/lambda.tf`                           | Add deployed Lambda resources for pay page flow     | Planned    |
| `terraform/modules/api-gateway/api-gateway.tf`                 | Add deployed script and mark-payment endpoints      | Planned    |
| `.github/workflows/deploy.yml`                                 | Add static asset deployment to S3                   | Planned    |
| `terraform/static/html/pay.html`                               | Static pay page artifact included in deploy runbook | Referenced |
| `terraform/static/html/scripts/override-links.js`              | Static script artifact included in deploy runbook   | Referenced |

---

## Impact

- Improves confidence and prevents regressions for Credit Card success marking
- No API contract changes
- No data model changes
- No infrastructure changes
