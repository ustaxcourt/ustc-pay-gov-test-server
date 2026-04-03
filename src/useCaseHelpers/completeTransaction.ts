import { CompletedTransaction, TransactionRequest } from "../types/Transaction";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";

export type CompleteTransaction = (
  transaction: TransactionRequest
) => CompletedTransaction;

export const completeTransaction: CompleteTransaction = (transaction) => {
  const now = DateTime.now();
  return {
    ...transaction,
    paid: true,
    paygov_tracking_id: uuidv4(),
    payment_date: DateTime.now().toFormat("yyyy-MM-dd"),
    payment_type: "PLASTIC_CARD",
    shipping_address_return_message: "address not available",
    transaction_date: now.toJSDate().toISOString(),
    transaction_status: "Success",
    transaction_type: "Sale",
    payment_frequency: "ONE_TIME",
    number_of_installments: 1,
  };
};
