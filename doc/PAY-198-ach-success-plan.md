# PAY-198: Pay.gov Test Server Supports ACH Successful Payments

## Overview

Add ACH payment simulation to the test server. This ticket also requires a **refactor of PAY-227's credit card failure implementation** so that the success and failure paths are generic and reusable across all future payment types (ACH, PayPal, etc.) via a single parameterized endpoint.

---

## Background / Current State (post-PAY-227)

1. Browser hits `GET /pay?token=xxx` → `getPayPageLambda` → `showPayPage` renders `pay.html`
2. `pay.html` has three links:
   - **Complete Payment** → redirects directly to `url_success` (no test-server call)
   - **Complete Payment (Credit Card - Failed)** → JS intercepts click, POSTs to `POST /pay/fail`, then JS redirects to `url_success`
   - **Cancel Payment** → redirects to `url_cancel`
3. USTC app calls SOAP `completeOnlineCollectionWithDetails`
4. Handler reads `InitiatedTransaction.failed_payment` → returns `Failed` or `Success`
5. `completeTransaction` hardcodes `payment_type: "PLASTIC_CARD"` regardless of what was clicked

**Problems with this design for future payment types:**

- `payment_type` is hardcoded in `completeTransaction` — adding ACH or PayPal requires new helpers
- The success path has no server-side stamp step — there is no place to record ACH-specific state (like `ach_initiated_at`) before the SOAP call
- The failure path is credit-card-specific — adding ACH Failed or PayPal Failed would each require their own new endpoint
- The JS script (`override-links.js`) only handles one link type; it would need ad-hoc changes for each new payment method

---

## Acceptance Criteria (from ticket)

- Pay page shows a new link: **"Complete Payment (ACH - Success)"**
- After that link is clicked:
  - SOAP `completeOnlineCollectionWithDetails` returns `transaction_status: Received` for the first 60 seconds
  - SOAP `completeOnlineCollectionWithDetails` returns `transaction_status: Success` after 60 seconds
  - All SOAP responses for that payment use `payment_type: ACH`

---

## Design: Single Generic Endpoint

Replace the specific `POST /pay/fail` route with one parameterized route that covers all payment method and status combinations:

```ts
app.post("/pay/:paymentMethod/:paymentStatus", markPaymentStatusLambda);
```

Example paths this handles:

| Path | What it stamps |
| --- | --- |
| `POST /pay/PLASTIC_CARD/Success` | `payment_type: PLASTIC_CARD` |
| `POST /pay/PLASTIC_CARD/Failed` | `payment_type: PLASTIC_CARD`, `failed_payment: true` |
| `POST /pay/ACH/Success` | `payment_type: ACH`, `ach_initiated_at: <now>` |
| `POST /pay/ACH/Failed` | `payment_type: ACH`, `failed_payment: true` |

Adding PayPal, Amazon, or any future `PaymentType` later requires **zero new endpoints** — just a new link on the pay page with the right `data` attributes.

The JS script (`override-links.js`) is generalized to intercept all pay page links that carry `data-payment-method` and `data-payment-status` attributes, POST to the appropriate path, then redirect to `url_success`.

---

## Implementation Plan

### Step 1 — Extend `InitiatedTransaction` type

**File:** [src/types/Transaction.ts](src/types/Transaction.ts)

Add `payment_type` and `ach_initiated_at` to `InitiatedTransaction`:

```ts
export type InitiatedTransaction = TransactionRequest & {
  token: string;
  payment_type?: PaymentType;    // stamped when user selects a payment method
  failed_payment?: boolean;       // stamped for failure scenarios
  ach_initiated_at?: string;      // ISO timestamp, stamped for ACH Success only
};
```

---

### Step 2 — Create `handleMarkPaymentStatus` use case

**New file:** `src/useCases/handleMarkPaymentStatus.ts`

Replaces `handleMarkPaymentFailed`. Accepts `paymentMethod` and `paymentStatus` (from route path params), stamps the correct fields on the `InitiatedTransaction`, and returns `url_success` for the lambda to return to the JS caller.

```ts
export const handleMarkPaymentStatus: HandleMarkPaymentStatus = async (
  appContext,
  { token, paymentMethod, paymentStatus }
) => {
  const transaction = await appContext
    .persistenceGateway()
    .getInitiatedTransaction(appContext, token);

  const isFailed = paymentStatus === "Failed";
  const isAchSuccess = paymentMethod === "ACH" && !isFailed;

  const updatedTransaction: InitiatedTransaction = {
    ...transaction,
    payment_type: paymentMethod,
    ...(isFailed && { failed_payment: true }),
    ...(isAchSuccess && {
      ach_initiated_at: DateTime.now().toJSDate().toISOString(),
    }),
  };

  await appContext
    .persistenceGateway()
    .saveInitiatedTransaction(appContext, updatedTransaction);

  return updatedTransaction.url_success;
};
```

Validate that `paymentMethod` is a known `PaymentType` and `paymentStatus` is `"Success"` or `"Failed"` — throw `InvalidRequestError` otherwise.

Wire into `appContext.ts` under `useCases()` and add the type to `AppContext.ts`.

---

### Step 3 — Create `markPaymentStatusLambda`

**New file:** `src/lambdas/markPaymentStatusLambda.ts`

Reads `paymentMethod` and `paymentStatus` from `req.params`, `token` from `req.query`. Calls `handleMarkPaymentStatus` and returns `200` with the `url_success` in the response body (so JS can redirect).

```ts
export async function markPaymentStatusLambda(req: Request, res: Response) {
  try {
    const { paymentMethod, paymentStatus } = req.params;
    const token = req.query.token;
    // validate token ...

    const urlSuccess = await res.locals.appContext
      .useCases()
      .handleMarkPaymentStatus(res.locals.appContext, {
        token,
        paymentMethod,
        paymentStatus,
      });

    res.status(200).json({ redirectUrl: urlSuccess });
  } catch (err) {
    handleLocalError(err, res);
  }
}
```

**Update route in `app.ts`:**

```ts
// remove:
app.post("/pay/fail", markPaymentFailedLambda);

// add:
app.post("/pay/:paymentMethod/:paymentStatus", markPaymentStatusLambda);
```

---

### Step 4 — Delete `handleMarkPaymentFailed` and `markPaymentFailedLambda`

**Files to delete:**

- `src/useCases/handleMarkPaymentFailed.ts`
- `src/lambdas/markPaymentFailedLambda.ts`

Remove their references from `AppContext.ts` and `appContext.ts`.

---

### Step 5 — Update `pay.html` with data attributes

**File:** [src/static/html/pay.html](src/static/html/pay.html)

Replace hardcoded `%%urlSuccess%%` references with `data-payment-method` and `data-payment-status` attributes. The JS reads these to construct the POST path. The `href` remains `%%urlSuccess%%` as the fallback redirect target.

```html
<html>
  <head>
    <title>Test Pay Page</title>
  </head>
  <body>
    <h1>This is a test payment page</h1>

    <p><a href="%%urlSuccess%%"
          data-payment-method="PLASTIC_CARD"
          data-payment-status="Success">Complete Payment</a></p>

    <p><a href="%%urlSuccess%%"
          data-payment-method="ACH"
          data-payment-status="Success">Complete Payment (ACH - Success)</a></p>

    <p><a href="%%urlSuccess%%"
          data-payment-method="PLASTIC_CARD"
          data-payment-status="Failed">Complete Payment (Credit Card - Failed)</a></p>

    <p><a href="%%urlCancel%%">Cancel Payment</a></p>

    <script type="text/javascript" src="/scripts/override-links.js"></script>
  </body>
</html>
```

`showPayPage.ts` continues to inject `%%urlSuccess%%` and `%%urlCancel%%` — no new template variables needed.

---

### Step 6 — Generalize `override-links.js`

**File:** `src/static/html/scripts/override-links.js`

Replace the hardcoded link-text-to-endpoint map with logic that reads `data-payment-method` and `data-payment-status` from each `<a>` tag. Any link with these attributes is intercepted; links without them (like Cancel) are left alone.

```js
(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  document.querySelectorAll("a[data-payment-method][data-payment-status]").forEach((link) => {
    link.addEventListener("click", async function (event) {
      event.preventDefault();

      const method = link.getAttribute("data-payment-method");
      const status = link.getAttribute("data-payment-status");
      const redirectUrl = link.getAttribute("href") || "/";

      try {
        const response = await fetch(
          `/pay/${encodeURIComponent(method)}/${encodeURIComponent(status)}?token=${encodeURIComponent(token)}`,
          { method: "POST" }
        );

        if (!response.ok) {
          const message = await response.text();
          window.alert(message || "Unable to process payment");
          return;
        }

        window.location.assign(redirectUrl);
      } catch {
        window.alert("Unable to process payment");
      }
    });
  });
})();
```

---

### Step 7 — Update `completeTransaction` to use `payment_type` from the transaction

**File:** [src/useCaseHelpers/completeTransaction.ts](src/useCaseHelpers/completeTransaction.ts)

Remove the hardcoded `PLASTIC_CARD`. Use `payment_type` from the `InitiatedTransaction`, defaulting to `PLASTIC_CARD` for backwards compatibility:

```ts
payment_type: transaction.payment_type ?? "PLASTIC_CARD",
```

---

### Step 8 — Update `handleCompleteOnlineCollectionWithDetails` for ACH timing

**File:** [src/useCases/handleCompleteOnlineCollectionWithDetails.ts](src/useCases/handleCompleteOnlineCollectionWithDetails.ts)

Extend the status resolution to handle ACH's time-based status alongside the existing `failed_payment` check:

```ts
function resolveTransactionStatus(transaction: InitiatedTransaction): TransactionStatus {
  if (transaction.failed_payment) {
    return "Failed";
  }
  if (transaction.payment_type === "ACH" && transaction.ach_initiated_at) {
    const elapsed = DateTime.now()
      .diff(DateTime.fromISO(transaction.ach_initiated_at), "seconds")
      .seconds;
    return elapsed < 60 ? "Received" : "Success";
  }
  return "Success";
}
```

Replace the current inline ternary with a call to `resolveTransactionStatus(transaction)`.

---

### Step 9 — Create `handleMarkPaymentStatus.test.ts`

**New file:** `src/useCases/handleMarkPaymentStatus.test.ts`

| Case | Assertion |
| --- | --- |
| PLASTIC_CARD Success | `payment_type: "PLASTIC_CARD"`, no `failed_payment`, no `ach_initiated_at` |
| ACH Success | `payment_type: "ACH"`, `ach_initiated_at` is set, no `failed_payment` |
| PLASTIC_CARD Failed | `payment_type: "PLASTIC_CARD"`, `failed_payment: true`, no `ach_initiated_at` |
| ACH Failed | `payment_type: "ACH"`, `failed_payment: true`, no `ach_initiated_at` |
| Unknown `paymentMethod` | Throws `InvalidRequestError` |
| Unknown `paymentStatus` | Throws `InvalidRequestError` |
| Returns `url_success` | Returned value matches transaction's `url_success` |

---

### Step 10 — Create `markPaymentStatusLambda.test.ts`

**New file:** `src/lambdas/markPaymentStatusLambda.test.ts`

| Case | Assertion |
| --- | --- |
| Valid request | Returns `200` with `{ redirectUrl }` in body |
| Missing `token` | Returns `400` |
| Invalid `paymentMethod` | Returns `400` |
| Invalid `paymentStatus` | Returns `400` |
| Use case throws | Delegates to `handleLocalError` |

---

### Step 11 — Update `completeTransaction.test.ts`

**File:** `src/useCaseHelpers/completeTransaction.test.ts`

| Case | Assertion |
| --- | --- |
| Transaction has `payment_type: "ACH"` | `payment_type` in result is `"ACH"` |
| Transaction has `payment_type: "PLASTIC_CARD"` | `payment_type` in result is `"PLASTIC_CARD"` |
| Transaction has no `payment_type` | `payment_type` in result falls back to `"PLASTIC_CARD"` |

---

### Step 12 — Update `handleCompleteOnlineCollectionWithDetails.test.ts`

**File:** `src/useCases/handleCompleteOnlineCollectionWithDetails.test.ts`

| Case | Assertion |
| --- | --- |
| `payment_type: "PLASTIC_CARD"`, no flags | `transaction_status: "Success"`, `payment_type: "PLASTIC_CARD"` |
| `failed_payment: true` | `transaction_status: "Failed"` |
| `payment_type: "ACH"`, `ach_initiated_at` < 60s ago | `transaction_status: "Received"`, `payment_type: "ACH"` |
| `payment_type: "ACH"`, `ach_initiated_at` ≥ 60s ago | `transaction_status: "Success"`, `payment_type: "ACH"` |

---

### Step 13 — Update `showPayPage.test.ts`

**File:** `src/useCases/showPayPage.test.ts`

| Case | Assertion |
| --- | --- |
| Rendered HTML contains all four links | `%%urlSuccess%%`, `%%urlCancel%%` are replaced; ACH link is present |
| `data-payment-method` and `data-payment-status` attributes are present on correct links | Spot-check the ACH and credit-card links in the output |

---

### Step 14 — Update `getPayPageLambda.test.ts`

**File:** `src/lambdas/getPayPageLambda.test.ts`

| Case | Assertion |
| --- | --- |
| Existing passing tests still pass | No regressions from pay.html changes |

---

### Step 15 — Delete test files for removed code

**Files to delete:**

- `src/useCases/handleMarkPaymentFailed.test.ts`
- `src/lambdas/markPaymentFailedLambda.test.ts`

---

## File Change Summary

| Action | File |
| --- | --- |
| Modify | `src/types/Transaction.ts` — add `payment_type?` and `ach_initiated_at?` to `InitiatedTransaction` |
| Create | `src/useCases/handleMarkPaymentStatus.ts` |
| Create | `src/lambdas/markPaymentStatusLambda.ts` |
| Delete | `src/useCases/handleMarkPaymentFailed.ts` |
| Delete | `src/lambdas/markPaymentFailedLambda.ts` |
| Modify | `src/app.ts` — replace `POST /pay/fail` with `POST /pay/:paymentMethod/:paymentStatus` |
| Modify | `src/useCaseHelpers/completeTransaction.ts` — use `payment_type` from transaction |
| Modify | `src/useCases/handleCompleteOnlineCollectionWithDetails.ts` — add `resolveTransactionStatus` with ACH timing |
| Modify | `src/static/html/pay.html` — add ACH link, switch to `data-payment-*` attributes |
| Modify | `src/static/html/scripts/override-links.js` — generalize to data-attribute-driven pattern |
| Modify | `src/types/AppContext.ts` — replace `handleMarkPaymentFailed` with `handleMarkPaymentStatus` |
| Modify | `src/appContext.ts` — wire up `handleMarkPaymentStatus`, remove `handleMarkPaymentFailed` |
| Create | `src/useCases/handleMarkPaymentStatus.test.ts` |
| Create | `src/lambdas/markPaymentStatusLambda.test.ts` |
| Modify | `src/useCaseHelpers/completeTransaction.test.ts` |
| Modify | `src/useCases/handleCompleteOnlineCollectionWithDetails.test.ts` |
| Modify | `src/useCases/showPayPage.test.ts` |
| Modify | `src/lambdas/getPayPageLambda.test.ts` |
| Delete | `src/useCases/handleMarkPaymentFailed.test.ts` |
| Delete | `src/lambdas/markPaymentFailedLambda.test.ts` |

---

## Notes

- **`resolveTransactionStatus` placement**: Shown inline in the handler. If it grows with more payment-type-specific logic, extract to `src/useCaseHelpers/resolveTransactionStatus.ts`.
- **Route param casing**: `paymentMethod` values (`PLASTIC_CARD`, `ACH`, `PAYPAL`) should match the existing `PaymentType` union. Validate in the use case and throw `InvalidRequestError` for unknown values.
- **Multiple SOAP calls across the 60s boundary**: `resolveTransactionStatus` recomputes on every call. The same token can legitimately return `Received` then `Success` as time passes — this is intentional.
- **`handleGetDetails` SOAP**: Returns the stored `CompletedTransaction.transaction_status` snapshot. For ACH this may lag behind `completeOnlineCollectionWithDetails`. Acceptable for a test server.
