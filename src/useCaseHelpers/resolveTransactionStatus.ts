import { DateTime } from "luxon";
import { InitiatedTransaction } from "../types/Transaction";
import { TransactionStatus } from "../types/TransactionStatus";

export const ACH_THRESHOLD_SECONDS = 15;

export const resolveTransactionStatus = (
  transaction: InitiatedTransaction
): TransactionStatus => {
  if (transaction.payment_type === "ACH" && transaction.ach_initiated_at) {
    const elapsed = DateTime.now()
      .diff(DateTime.fromISO(transaction.ach_initiated_at), "seconds")
      .seconds;

    if (elapsed < ACH_THRESHOLD_SECONDS) {
      return "Received";
    }
    return transaction.failed_payment ? "Failed" : "Success";
  }
  if (transaction.failed_payment) {
    return "Failed";
  }
  return "Success";
};
