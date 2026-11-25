# 0005 - Verify Pay.gov GetDetails Support for agency_tracking_id

## Status

Accepted

## Date

2026-11-25

## Context

PAY-421 requires a mechanism for determining the status of a Pay.gov transaction when a `paygov_tracking_id` is unavailable.

One possible scenario is a timeout occurring after a transaction has been initiated but before the application receives and stores the `paygov_tracking_id`.

The team investigated whether Pay.gov's GetDetails API supports lookup by `agency_tracking_id` as an alternative identifier.

If supported, the application could use the existing transaction reference identifier (`agency_tracking_id`) to retrieve transaction status information from Pay.gov and recover from timeout scenarios.

## Investigation

A transaction was initiated against the Staging Payments environment, which integrates with the Pay.gov QA environment.

Example request:

```bash
POST /init
```

Payload:

```json
{
  "transactionReferenceId": "550e8400-e29b-41d4-a716-446655440020",
  "fee": "PETITION_FILING_FEE"
}
```

Response:

```json
{
  "token": "<redacted>",
  "paymentRedirect": "<redacted>"
}
```

A subsequent GetDetails request was performed using the transaction identifier.

Example request:

```http
GET /details/{agency_tracking_id}
```

Response:

```json
{
  "paymentStatus": "pending",
  "transactions": [
    {
      "transactionStatus": "initiated",
      "createdTimestamp": "2026-11-10T16:01:06.642Z",
      "updatedTimestamp": "2026-11-10T16:01:07.120Z"
    }
  ]
}
```

### Findings

The Pay.gov QA environment successfully returned transaction details when queried using an agency_tracking_id.

The response indicates that:

The transaction can be located without a paygov_tracking_id.
An initiated but not yet processed transaction is returned with:
paymentStatus: pending
transactionStatus: initiated
Timestamp information is available for both creation and update events.
Initiated Transaction Response

Example response:

```json
{
  "paymentStatus": "pending",
  "transactions": [
    {
      "transactionStatus": "initiated",
      "createdTimestamp": "2026-11-10T16:01:06.642Z",
      "updatedTimestamp": "2026-11-10T16:01:07.120Z"
    }
  ]
}
```

### Decision

The team may use agency_tracking_id as an alternative lookup mechanism when a paygov_tracking_id is unavailable.

This approach enables status verification and recovery for transactions affected by timeout scenarios during transaction initiation.

### Consequences

#### Positive

Reduces dependency on immediate receipt of a paygov_tracking_id.
Provides a recovery path for timeout scenarios.
Supports implementation of PAY-421.
Allows transaction reconciliation using identifiers already stored by the application.

#### Negative

Additional handling logic will be required when determining which identifier should be used for Pay.gov lookups.
Error handling and monitoring will be needed for fallback lookup failures.

### Follow-up Work

Create a User Story implementing GetDetails lookup using agency_tracking_id when paygov_tracking_id is unavailable.
Evaluate existing timeout handling code for simplification after fallback lookup support is implemented.
Document any differences between responses returned by agency_tracking_id and paygov_tracking_id lookups if discovered during implementation.

### References

PAY-421
PAY-512 (Spike ticket)
Pay.gov GetDetails API
