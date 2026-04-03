import { CompletedTransaction, TransactionRequest } from "../types/Transaction";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { TransactionStatus } from "../types/TransactionStatus";

export type CompleteTransaction = (
  transaction: TransactionRequest,
  options?: { transactionStatus?: TransactionStatus }
) => CompletedTransaction;

export const completeTransaction: CompleteTransaction = (transaction, options) => {
  const now = DateTime.now();
  const transactionStatus = options?.transactionStatus ?? "Success";

  return {
    ...transaction,
    paid: true,
    paygov_tracking_id: uuidv4(),
    payment_date: now.toFormat("yyyy-MM-dd"),
    payment_type: "PLASTIC_CARD",
    shipping_address_return_message: "address not available",
    transaction_date: now.toJSDate().toISOString(),
    transaction_status: transactionStatus,
    transaction_type: "Sale",
    payment_frequency: "ONE_TIME",
    number_of_installments: 1,
  };
};
