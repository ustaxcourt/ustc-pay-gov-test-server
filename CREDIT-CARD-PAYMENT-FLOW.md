THIS IS A TEMP FILE ONLY HERE TO HAVE BETTER CLARITY DURING SSTORY. WILL LATER RMEOVE


# Credit Card Success Payment Flow

Complete end-to-end flow for a PLASTIC_CARD Success payment, from user click to final status retrieval.

---

## Phase 1: User Initiates Payment

### Step 1: User Clicks Link
**File**: `src/static/html/pay.html` (line 15-17)

```html
<p><a href="%%urlSuccess%%"
      data-payment-method="PLASTIC_CARD"
      data-payment-status="Success">
  Complete Payment (Credit Card - Success)
</a></p>
```

### Step 2: Browser JavaScript Intercepts Click
**File**: `src/static/html/scripts/override-links.js`

- Reads `data-payment-method` attribute → `"PLASTIC_CARD"`
- Reads `data-payment-status` attribute → `"Success"`
- Extracts token from URL query parameter

### Step 3: Browser Makes POST Request
```
POST /pay/PLASTIC_CARD/Success?token={token}
Content-Type: application/json
```

---

## Phase 2: Mark Payment Status (Backend)

### Step 4: Express Route Receives Request
**File**: `src/app.ts` (line 38)

```typescript
app.post("/pay/:paymentMethod/:paymentStatus", markPaymentStatusLambda);
```

### Step 5: Handler Validates Request
**File**: `src/lambdas/markPaymentStatusLambda.ts` (line 53-66)

Validates:
- ✓ Token exists
- ✓ Payment method is valid (`"PLASTIC_CARD"`)
- ✓ Payment status is valid (`"Success"`)

### Step 6: Call Mark Payment Use Case
**File**: `src/useCases/handleMarkPaymentStatus.ts`

Function signature:
```typescript
handleMarkPaymentStatus(appContext, {
  token: "abc123",
  paymentMethod: "PLASTIC_CARD",
  paymentStatus: "Success"
})
```

### Step 7: Load Existing Transaction
Query database/cache for token:
```typescript
{
  token: "abc123",
  url_success: "https://example.com/success",
  agency_tracking_id: "uuid-here",
  tcp_appid: "ustc-test-pay-gov-app",
  transaction_amount: "10.00",
  // ... other fields
}
```

### Step 8: Create Updated Transaction
**File**: `src/useCases/handleMarkPaymentStatus.ts` (line 35-45)

```typescript
const updatedTransaction: InitiatedTransaction = {
  ...transaction,
  payment_type: "PLASTIC_CARD",           // Set
  // failed_payment: NOT SET (Success path)
  // NO ach_initiated_at
  // NO paypal_initiated_at
};
```

Key point: For PLASTIC_CARD Success, only `payment_type` is set. No timestamps or failed flags.

### Step 9: Save Updated Transaction
**File**: `src/useCases/handleMarkPaymentStatus.ts` (line 47-50)

```typescript
await appContext
  .persistenceGateway()
  .saveInitiatedTransaction(appContext, updatedTransaction);
```

### Step 10: Return Response to Browser
```json
{
  "redirectUrl": "https://example.com/success"
}
```

Browser redirects to success URL.

---

## Phase 3: Complete Collection (Later - SOAP Request)

### Step 11: Browser Calls completeOnlineCollectionWithDetails
SOAP XML Request:
```xml
<soapenv:Envelope>
  <soapenv:Body>
    <tcs:completeOnlineCollectionWithDetails>
      <completeOnlineCollectionWithDetailsRequest>
        <token>abc123</token>
      </completeOnlineCollectionWithDetailsRequest>
    </tcs:completeOnlineCollectionWithDetails>
  </soapenv:Body>
</soapenv:Envelope>
```

### Step 12: SOAP Request Handler Processes
**File**: `src/lambdas/handleSoapRequestLambda.ts` (line 38-44)

- Parses XML
- Extracts action: `"tcs:completeOnlineCollectionWithDetails"`
- Routes to appropriate handler

### Step 13: Call Complete Collection Use Case
**File**: `src/useCases/handleCompleteOnlineCollectionWithDetails.ts`

```typescript
handleCompleteOnlineCollectionWithDetails(appContext, { token })
```

### Step 14: Load Transaction from Persistence
Retrieves:
```typescript
{
  token: "abc123",
  payment_type: "PLASTIC_CARD",      // Loaded ✓
  // failed_payment: undefined         // Not set
  url_success: "https://example.com/success",
  // ... all other fields
}
```

### Step 15: Resolve Transaction Status
**File**: `src/useCaseHelpers/resolveTransactionStatus.ts`

```typescript
export const resolveTransactionStatus = (
  transaction: InitiatedTransaction
): TransactionStatus => {
  if (transaction.payment_type === "ACH" && transaction.ach_initiated_at) {
    // ACH time-based logic (not PLASTIC_CARD)
    const elapsed = DateTime.now()
      .diff(DateTime.fromISO(transaction.ach_initiated_at), "seconds")
      .seconds;
    if (transaction.failed_payment) {
      return elapsed < 60 ? "Received" : "Failed";
    }
    return elapsed < 15 ? "Received" : "Success";
  }

  // THIS PATH EXECUTES FOR PLASTIC_CARD
  if (transaction.failed_payment) {
    return "Failed";  // ← NOT executed (failed_payment is undefined)
  }
  return "Success";   // ← THIS EXECUTES ✓
};
```

**Result**: `transaction_status = "Success"`

### Step 16: Complete the Transaction
**File**: `src/useCaseHelpers/completeTransaction.ts` (line 11-27)

```typescript
export const completeTransaction: CompleteTransaction = (transaction, options) => {
  const now = DateTime.now();
  const transactionStatus = options?.transactionStatus ?? "Success";

  return {
    ...transaction,
    paid: transactionStatus === "Success",           // true ✓
    paygov_tracking_id: generatePaygovTrackingId(),  // 21-char ID
    payment_date: now.toFormat("yyyy-MM-dd"),        // "2026-04-22"
    payment_type: transaction.payment_type ?? "PLASTIC_CARD",  // "PLASTIC_CARD" ✓
    transaction_date: now.toJSDate().toISOString(),  // "2026-04-22T14:30:45.123Z"
    transaction_status: transactionStatus,           // "Success" ✓
    transaction_type: "Sale",
    payment_frequency: "ONE_TIME",
    number_of_installments: 1,
  };
};
```

### Step 17: Build SOAP XML Response
**File**: `src/useCaseHelpers/buildXml.ts` (line 28-52)

```typescript
export const buildXml: BuildXml = ({ responseType, response }) => {
  const formattedResponse = {
    [`ns2:${responseType}`]: {
      [responseType]: response,
      "@xmlns:ns2": "http://fms.treas.gov/services/tcsonline",
    },
  };

  const respObj = {
    "S:Envelope": {
      "S:Header": {
        "work:WorkContext": { /* ... */ },
      },
      "S:Body": formattedResponse,
      "@xmlns:S": "http://schemas.xmlsoap.org/soap/envelope/",
    },
  };

  const builder = new XMLBuilder(xmlOptions);
  return builder.build(respObj);  // Returns XML string
};
```

### Step 18: Return Response to Browser
SOAP XML Response (excerpt):
```xml
<S:Envelope>
  <S:Body>
    <ns2:completeOnlineCollectionWithDetailsResponse>
      <completeOnlineCollectionWithDetailsResponse>
        <paygov_tracking_id>XXX XXX XXXXXXXXXX XXX</paygov_tracking_id>
        <transaction_status>Success</transaction_status>
        <payment_type>PLASTIC_CARD</payment_type>
        <payment_date>2026-04-22</payment_date>
        <transaction_date>2026-04-22T14:30:45.123Z</transaction_date>
        <!-- ... other fields -->
      </completeOnlineCollectionWithDetailsResponse>
    </ns2:completeOnlineCollectionWithDetailsResponse>
  </S:Body>
</S:Envelope>
```

---

## Phase 4: Get Details (Later - Query Final Status)

### Step 19: Browser Calls getDetails
SOAP XML Request:
```xml
<soapenv:Envelope>
  <soapenv:Body>
    <tcs:getDetails>
      <getDetailsRequest>
        <paygov_tracking_id>XXX XXX XXXXXXXXXX XXX</paygov_tracking_id>
      </getDetailsRequest>
    </tcs:getDetails>
  </soapenv:Body>
</soapenv:Envelope>
```

### Step 20: SOAP Request Handler Routes
**File**: `src/lambdas/handleSoapRequestLambda.ts` (line 46-52)

Routes to: `handleGetDetails`

### Step 21: Call Get Details Use Case
**File**: `src/useCases/handleGetDetails.ts`

- Loads transaction by `paygov_tracking_id`
- Calls `resolveTransactionStatus()` (same as Step 15)
- Returns completed transaction

**Result**: `transaction_status: "Success"`, `payment_type: "PLASTIC_CARD"`

### Step 22: Build and Return SOAP Response
Same format as Step 17-18

---

## Key Decision Points for PLASTIC_CARD

| Point | PLASTIC_CARD Behavior |
|-------|----------------------|
| **Payment marking** | Sets `payment_type="PLASTIC_CARD"`, NO `failed_payment` flag |
| **Timestamp** | NO timestamp set (unlike ACH/PayPal) |
| **Status resolution** | No time-based logic, goes straight to final status |
| **Final status** | Always `"Success"` (unless `failed_payment` is set separately) |
| **completeOnlineCollectionWithDetails** | Returns `transaction_status="Success"`, `payment_type="PLASTIC_CARD"` |
| **getDetails** | Returns same values as above |

---

## Files Involved (In Execution Order)

| Step | File | Function/Purpose |
|------|------|------------------|
| 1-3 | `src/static/html/pay.html` | HTML link with data attributes |
| 2 | `src/static/html/scripts/override-links.js` | Browser script intercepts click |
| 4-5 | `src/app.ts` | Express route definition |
| 5 | `src/lambdas/markPaymentStatusLambda.ts` | Validate request parameters |
| 6 | `src/useCases/handleMarkPaymentStatus.ts` | Mark payment logic |
| 15 | `src/useCaseHelpers/resolveTransactionStatus.ts` | **CRITICAL**: Resolve status to "Success" |
| 16 | `src/useCaseHelpers/completeTransaction.ts` | Create completed transaction |
| 17 | `src/useCaseHelpers/buildXml.ts` | Build SOAP XML response |
| 21 | `src/useCases/handleGetDetails.ts` | Retrieve transaction details |

---

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ BROWSER                                                              │
└─────────────────────────────────────────────────────────────────────┘

  Click: "Complete Payment (Credit Card - Success)"
                          ↓
  Browser Script reads: paymentMethod="PLASTIC_CARD", status="Success"
                          ↓
  POST /pay/PLASTIC_CARD/Success?token=abc123
                          ↓
  ┌─────────────────────────────────────────────────────────────────┐
  │ BACKEND                                                           │
  └─────────────────────────────────────────────────────────────────┘

  markPaymentStatusLambda (validate)
                          ↓
  handleMarkPaymentStatus (mark)
    └─> Set: payment_type="PLASTIC_CARD"
    └─> Save to database
                          ↓
  Response: { redirectUrl: "https://example.com/success" }
                          ↓
  Browser redirects to success URL


LATER: completeOnlineCollectionWithDetails (SOAP)
                          ↓
  handleSoapRequestLambda (route)
                          ↓
  handleCompleteOnlineCollectionWithDetails
                          ↓
  resolveTransactionStatus
    └─> No ACH logic (no ach_initiated_at)
    └─> No failed_payment flag
    └─> Return "Success" ✓
                          ↓
  completeTransaction
    └─> Create CompletedTransaction
    └─> Set transaction_status="Success"
    └─> Set payment_type="PLASTIC_CARD"
                          ↓
  buildXml (SOAP envelope)
                          ↓
  Response: SOAP XML with transaction_status="Success", payment_type="PLASTIC_CARD"


LATER: getDetails (SOAP)
                          ↓
  handleGetDetails
    └─> Load transaction by paygov_tracking_id
    └─> resolveTransactionStatus (same logic)
    └─> Return: transaction_status="Success", payment_type="PLASTIC_CARD"
                          ↓
  Response: SOAP XML with final details
```

---

## Test Coverage (PAY-251)

The implementation plan tests this complete flow:

- **Step 6 Integration Test**: Marks PLASTIC_CARD as Success → calls completeOnlineCollectionWithDetails → verifies `transaction_status="Success"` and `payment_type="PLASTIC_CARD"`
- **Step 7 Integration Test**: Same flow but calls getDetails → verifies same values
- **Step 8 Unit Test**: Verifies mark payment logic saves correct transaction state

See: `PAY-251-IMPLEMENTATION-PLAN.md` for test details.




Step	File	Function
1-3	src/static/html/pay.html	HTML link & browser script
4-5	src/app.ts	Express route
5	src/lambdas/markPaymentStatusLambda.ts	Validate request
6	src/useCases/handleMarkPaymentStatus.ts	Mark payment
15	src/useCaseHelpers/resolveTransactionStatus.ts	KEY: Resolve status → "Success"
16	src/useCaseHelpers/completeTransaction.ts	Create completed transaction
17	src/useCaseHelpers/buildXml.ts	Build SOAP response
21	src/useCases/handleGetDetails.ts	Return final details
