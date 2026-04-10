import { AppContext } from "../types/AppContext";
import { pick } from "lodash";
import {
  InitiatedTransaction,
  PaymentFrequencyType,
  PaymentType,
  TransactionType,
} from "../types/Transaction";
import { CompleteTransactionRequest } from "../types/CompleteTransactionRequest";
import { TransactionStatus } from "../types/TransactionStatus";
import { DateTime } from "luxon";

export type CompleteOnlineCollectionWithDetailsResponse = {
  paygov_tracking_id: string;
  agency_tracking_id: string;
  transaction_amount: string;
  transaction_type: TransactionType;
  transaction_date: string;
  payment_date: string;
  transaction_status: TransactionStatus;
  payment_type: PaymentType;
  payment_frequency: PaymentFrequencyType;
  number_of_installments: number;
};

export type HandleCompletOnlineCollectionWithDetails = (
  appContext: AppContext,
  { token }: CompleteTransactionRequest
) => Promise<string>;

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
  return "Success";
};

export const handleCompleteOnlineCollectionWithDetails: HandleCompletOnlineCollectionWithDetails =
  async (appContext, { token }) => {
    const transaction: InitiatedTransaction = await appContext
      .persistenceGateway()
      .getInitiatedTransaction(appContext, token);

    const transactionStatus: TransactionStatus = resolveTransactionStatus(transaction);

    const completedTransaction = appContext
      .useCaseHelpers()
      .completeTransaction(transaction, { transactionStatus });

    await appContext
      .persistenceGateway()
      .saveCompletedTransaction(appContext, completedTransaction);

    const response: CompleteOnlineCollectionWithDetailsResponse = {
      ...pick(completedTransaction, [
        "paygov_tracking_id",
        "agency_tracking_id",
        "transaction_amount",
        "transaction_type",
        "transaction_date",
        "payment_date",
        "transaction_status",
        "payment_type",
        "payment_frequency",
        "number_of_installments",
      ])
    };

    return appContext.useCaseHelpers().buildXml({
      response,
      responseType: "completeOnlineCollectionWithDetailsResponse",
    });
  };
