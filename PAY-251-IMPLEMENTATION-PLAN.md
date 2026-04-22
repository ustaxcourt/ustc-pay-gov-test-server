# PAY-251: Credit Card Success Payments - Implementation Plan

## Objective
Ensure the end-to-end Credit Card Success flow works correctly:

1. User clicks "Complete Payment (Credit Card - Success)" link
2. Backend marks the token as `PLASTIC_CARD` with `Success` status
3. `completeOnlineCollectionWithDetails` resolves `transaction_status` to `Success`
4. `getDetails` also resolves `transaction_status` to `Success`
5. Add test coverage to verify the complete flow

**Scope**: Functional verification + regression testing. No breaking changes. No refactoring.

---

## Overview

| Component | Status | Action |
|-----------|--------|--------|
| HTML link | Already exists | ✓ Verified |
| Browser script | Already works | ✓ Verified |
| Mark payment endpoint | Needs verification | **VERIFY** |
| completeOnlineCollectionWithDetails response | Needs verification | **VERIFY** |
| getDetails response | Needs verification | **VERIFY** |
| Transaction status resolution | Needs verification | **VERIFY** |
| Test coverage | Missing | **ADD** |
| Documentation | Needs update | **UPDATE** |

---

## Implementation Steps

### Step 1: Verify HTML Link Exists ✓
**File**: `src/static/html/pay.html` (line 15-17)

**Verified**: The link exists with correct attributes:
```html
<p><a href="%%urlSuccess%%"
      data-payment-method="PLASTIC_CARD"
      data-payment-status="Success">Complete Payment (Credit Card - Success)</a></p>
```

**Action**: ✓ No change needed.

---

### Step 2: Verify Browser Script Posts Correctly ✓
**File**: `src/static/html/scripts/override-links.js`

**Verified**: The script:
1. Reads `data-payment-method` attribute → gets `"PLASTIC_CARD"`
2. Reads `data-payment-status` attribute → gets `"Success"`
3. Posts to `/pay/PLASTIC_CARD/Success?token={token}`

**Action**: ✓ No change needed.

---

### Step 3: Verify Mark Payment Endpoint Works
**File**: `src/useCases/handleMarkPaymentStatus.ts`

**Verify the logic**:
```typescript
const updatedTransaction: InitiatedTransaction = {
  ...transaction,
  payment_type: paymentMethod,  // Sets "PLASTIC_CARD"
  ...(isFailed && { failed_payment: true }),  // NOT set for Success
};
```

**Expected behavior**:
- ✓ Accepts `paymentMethod: "PLASTIC_CARD"` and `paymentStatus: "Success"`
- ✓ Saves transaction with `payment_type: "PLASTIC_CARD"`
- ✓ Does NOT set `failed_payment` flag
- ✓ Returns `url_success` for redirect

**Action**: ✓ No code changes needed. Just verify the logic is correct.

---

### Step 4: Verify completeOnlineCollectionWithDetails Resolves to Success
**File**: `src/useCaseHelpers/resolveTransactionStatus.ts`

**Verify the logic**:
```typescript
return transaction.failed_payment ? "Failed" : "Success";
```

**Expected behavior**:
- ✓ For PLASTIC_CARD without `failed_payment` flag → returns `"Success"`
- ✓ `completeOnlineCollectionWithDetails` gets this status
- ✓ Response includes `transaction_status: "Success"` and `payment_type: "PLASTIC_CARD"`

**Action**: ✓ No code changes needed. The logic is already correct.

---

### Step 5: Verify getDetails Also Resolves to Success
**File**: `src/useCases/handleGetDetails.ts` (or wherever details are resolved)

**Expected behavior**:
- ✓ When calling `getDetails` with the tracking ID
- ✓ It calls `resolveTransactionStatus` with the persisted transaction
- ✓ Returns same `transaction_status: "Success"` and `payment_type: "PLASTIC_CARD"`

**Action**: ✓ No code changes needed. Uses the same resolution logic.

---

### Step 6: Add Integration Test - completeOnlineCollectionWithDetails
**File**: `test/integration/transaction-http.test.ts`

**Add after the existing success tests** (around line 204):

```typescript
it("should mark PLASTIC_CARD as Success and resolve to Success status in completeOnlineCollectionWithDetails", async () => {
  // 1. Start a transaction
  const { token, agencyTrackingId } = await startOnlineCollection(amount);

  // 2. Mark the token as PLASTIC_CARD Success
  const markResponse = await markPaymentStatus(token, "PLASTIC_CARD", "Success");
  expect(markResponse.status).toBe(200);

  // 3. Complete the collection (calls completeOnlineCollectionWithDetails)
  const trackingResponse = await completeOnlineCollectionWithDetails(token);

  // 4. Verify the full response
  expect(trackingResponse.transaction_status).toBe("Success");
  expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
  expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
  expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
  expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
  expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
});
```

**Validates**:
- ✓ Mark payment endpoint accepts PLASTIC_CARD + Success
- ✓ Transaction is persisted correctly
- ✓ `completeOnlineCollectionWithDetails` resolves status to `Success`
- ✓ Payment type is correctly set to `PLASTIC_CARD`

---

### Step 7: Add Integration Test - getDetails
**File**: `test/integration/transaction-http.test.ts`

**Add after the completeOnlineCollectionWithDetails test**:

```typescript
it("should resolve PLASTIC_CARD Success to Success status in getDetails", async () => {
  // 1. Start a transaction
  const { token, agencyTrackingId } = await startOnlineCollection(amount);

  // 2. Mark the token as PLASTIC_CARD Success
  await markPaymentStatus(token, "PLASTIC_CARD", "Success");

  // 3. Get details via completeOnlineCollectionWithDetails to get tracking ID
  const completeResponse = await completeOnlineCollectionWithDetails(token);
  const trackingId = completeResponse.paygov_tracking_id;

  // 4. Call getDetails with the tracking ID
  const detailsResponse = await getDetails(trackingId);

  // 5. Verify getDetails also shows Success status
  expect(detailsResponse.transaction_status).toBe("Success");
  expect(detailsResponse.payment_type).toBe("PLASTIC_CARD");
  expect(detailsResponse.agency_tracking_id).toBe(agencyTrackingId);
});
```

**Validates**:
- ✓ `getDetails` uses the same status resolution logic
- ✓ Returns `transaction_status: "Success"`
- ✓ Returns `payment_type: "PLASTIC_CARD"`

---

### Step 8: Add Unit Test (Mark Payment)
**File**: `src/useCases/handleMarkPaymentStatus.test.ts`

**Add after the existing PLASTIC_CARD tests** (around line 135):

```typescript
it("updates transaction with PLASTIC_CARD success", async () => {
  const getInitiatedTransaction = jest.fn().mockResolvedValue({
    token: "tok",
    url_success: "https://success.url",
  });
  const saveInitiatedTransaction = jest.fn().mockResolvedValue(undefined);

  const appContext = {
    persistenceGateway: () => ({
      getInitiatedTransaction,
      saveInitiatedTransaction,
    }),
  } as unknown as Parameters<typeof handleMarkPaymentStatus>[0];

  const result = await handleMarkPaymentStatus(appContext, {
    token: "tok",
    paymentMethod: "PLASTIC_CARD",
    paymentStatus: "Success",
  });

  // Verify the transaction was saved correctly
  expect(saveInitiatedTransaction).toHaveBeenCalledWith(appContext, {
    token: "tok",
    url_success: "https://success.url",
    payment_type: "PLASTIC_CARD",
    // Note: no failed_payment flag, no timestamp
  });

  expect(result).toBe("https://success.url");
});
```

**Validates**:
- ✓ Saves `payment_type: "PLASTIC_CARD"`
- ✓ Does NOT set `failed_payment` flag
- ✓ Does NOT set any timestamp (unlike ACH/PayPal)
- ✓ Returns redirect URL

---

### Step 9: Verify Status Resolution Test Exists
**File**: `src/useCaseHelpers/resolveTransactionStatus.test.ts`

**Verify this test exists** (around line 22):

```typescript
describe("PLASTIC_CARD with no flags", () => {
  it("returns Success", () => {
    const result = resolveTransactionStatus({
      ...baseTransaction,
      payment_type: "PLASTIC_CARD",
    });
    expect(result).toBe("Success");
  });
});
```

**Action**: ✓ No change needed. This test should already exist. Just confirm it passes.

---

### Step 10: Update Documentation
**File**: `running-locally.md` (around line 75-85)

**Verify the "Complete Payment" links section** lists all scenarios:

```markdown
The rendered page should include these links:

- Complete Payment (PayPal - Success)
- Complete Payment (Credit Card - Success)
- Complete Payment (ACH - Success)
- Complete Payment (Credit Card - Failed)
- Complete Payment (ACH - Failed)
- Complete Payment (PayPal - Failed)
- Cancel Payment
```

**Action**: ✓ Documentation should already be correct. Just verify.

---

## Validation Checklist

### Pre-Test Verification

- [ ] **Step 1**: Confirm HTML link exists in `src/static/html/pay.html` ✓
- [ ] **Step 2**: Confirm browser script in `override-links.js` posts correctly ✓
- [ ] **Step 3**: Review `handleMarkPaymentStatus.ts` logic ✓
- [ ] **Step 4**: Review `resolveTransactionStatus.ts` logic ✓
- [ ] **Step 5**: Verify `getDetails` uses the same resolution logic ✓

### Test Implementation

- [ ] **Step 6**: Add integration test for `completeOnlineCollectionWithDetails`
- [ ] **Step 7**: Add integration test for `getDetails`
- [ ] **Step 8**: Add unit test for mark payment
- [ ] **Step 9**: Verify status resolution test exists

### Test Execution

Before merging, run:

```bash
# Unit tests
npm test -- src/useCases/handleMarkPaymentStatus.test.ts

# Status resolution tests
npm test -- src/useCaseHelpers/resolveTransactionStatus.test.ts

# Integration tests
NODE_ENV=local jest --runInBand test/integration/transaction-http.test.ts

# All tests
npm test
```

**All should pass. ✓**

---

## Files Changed Summary

| File | Change Type | Lines | Purpose |
|------|------------|-------|---------|
| `test/integration/transaction-http.test.ts` | Add 2 tests | ~40 | **completeOnlineCollectionWithDetails** and **getDetails** verification |
| `src/useCases/handleMarkPaymentStatus.test.ts` | Add 1 test | ~25 | Mark payment logic verification |
| `running-locally.md` | Verify | 0 | Documentation check only |
| `src/static/html/pay.html` | Verify | 0 | HTML link check only |
| `src/useCaseHelpers/resolveTransactionStatus.test.ts` | Verify | 0 | Test existence check only |

**Total: 2 files changed (~65 lines), 3 files verified.**

---

## Implementation Checklist

- [ ] **Verification**: Steps 1-5 (review existing code paths)
- [ ] **Integration Test 1**: Add completeOnlineCollectionWithDetails test (Step 6)
- [ ] **Integration Test 2**: Add getDetails test (Step 7)
- [ ] **Unit Test**: Add mark payment test (Step 8)
- [ ] **Test Verification**: Confirm status resolution test exists (Step 9)
- [ ] **Documentation**: Verify docs are correct (Step 10)
- [ ] **Run Tests**: Execute full test suite and confirm all pass
- [ ] **Code Review**: Verify no unintended changes

---

