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

## Steps

### 1. Confirm pay page metadata

Verify the link in `src/static/html/pay.html` has:

- `data-payment-method="PLASTIC_CARD"`
- `data-payment-status="Success"`
- `href="%%urlSuccess%%"`

### 2. Confirm client-side POST routing

Verify `src/static/html/scripts/override-links.js`:

- reads method/status from data attributes
- posts to `/pay/:paymentMethod/:paymentStatus?token=...`
- correctly forms `/pay/PLASTIC_CARD/Success?token=...` for this case

### 3. Confirm API route and validation

Verify:

- `src/app.ts` exposes `POST /pay/:paymentMethod/:paymentStatus`
- `src/lambdas/markPaymentStatusLambda.ts` validates token, payment method, and status
- successful requests return HTTP 200 with `{ redirectUrl }`

### 4. Confirm persistence logic for credit-card success

Verify `src/useCases/handleMarkPaymentStatus.ts`:

- writes `payment_type: "PLASTIC_CARD"`
- does not set `failed_payment` when status is `Success`
- returns `url_success`

### 5. Confirm downstream status resolution

Verify `src/useCaseHelpers/resolveTransactionStatus.ts` ensures this path resolves to `Success`.

### 6. Add lambda regression test

Add explicit test in `src/lambdas/markPaymentStatusLambda.test.ts` for:

- `paymentMethod: "PLASTIC_CARD"`
- `paymentStatus: "Success"`
- expected `200` plus `{ redirectUrl }`

### 7. Validate with targeted tests

Run:

```bash
npm test -- --runInBand src/useCases/showPayPage.test.ts src/useCases/handleMarkPaymentStatus.test.ts src/lambdas/markPaymentStatusLambda.test.ts src/useCases/handleGetDetails.test.ts
```

Expected: all tests pass.

---

## Verification Evidence

- `showPayPage` test verifies the Credit Card success link exists and points to success URL
- `handleMarkPaymentStatus` test verifies `PLASTIC_CARD` + `Success` persistence behavior
- `markPaymentStatusLambda` test verifies route params are forwarded and success JSON is returned
- `handleGetDetails` plus resolver behavior confirms final transaction status is `Success`

---

## Files Touched (PAY-251)

| File                                                           | Action                                              | Status |
| -------------------------------------------------------------- | --------------------------------------------------- | ------ |
| `src/lambdas/markPaymentStatusLambda.test.ts`                  | Add explicit `PLASTIC_CARD` + `Success` lambda test | Done   |
| `doc/architecture/PAY-251-add-credit-card-success-payments.md` | Reformat and document verified plan/evidence        | Done   |

---

## Impact

- Improves confidence and prevents regressions for Credit Card success marking
- No API contract changes
- No data model changes
- No infrastructure changes
