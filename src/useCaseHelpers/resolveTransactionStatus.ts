import { DateTime } from "luxon";
import { InitiatedTransaction } from "../types/Transaction";
import { TransactionStatus } from "../types/TransactionStatus";

export const resolveTransactionStatus = (
  transaction: InitiatedTransaction
): TransactionStatus => {
  if (transaction.failed_payment) {
    return "Failed";
  }
  if (transaction.payment_type === "ACH" && transaction.ach_initiated_at) {
    const elapsed = DateTime.now()
      .diff(DateTime.fromISO(transaction.ach_initiated_at), "seconds")
      .seconds;
    return elapsed < 15 ? "Received" : "Success";
  }
  if (transaction.payment_type === "PAYPAL" && transaction.paypal_initiated_at) {
    const elapsed = DateTime.now()
      .diff(DateTime.fromISO(transaction.paypal_initiated_at), "seconds")
      .seconds;
    return elapsed < 15 ? "Received" : "Success";
  }
  return "Success";
};
