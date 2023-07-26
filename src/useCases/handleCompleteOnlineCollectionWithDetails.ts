import { AppContext } from "../types/AppContext";
import { pick } from "lodash";
import {
  PaymentType,
  TransactionRequest,
  TransactionType,
} from "../types/Transaction";
import { CompleteTransactionRequest } from "../types/CompleteTransactionRequest";
import { TransactionStatus } from "../types/TransactionStatus";

export type CompleteOnlineCollectionWithDetailsResponse = {
  paygov_tracking_id: string;
  agency_tracking_id: string;
  transaction_amount: string;
  transaction_type: TransactionType;
  transaction_date: string;
  payment_date: string;
  transaction_status: TransactionStatus;
  payment_type: PaymentType;
};

export type HandleCompletOnlineCollectionWithDetails = (
  appContext: AppContext,
  { token }: CompleteTransactionRequest
) => Promise<string>;

export const handleCompleteOnlineCollectionWithDetails: HandleCompletOnlineCollectionWithDetails =
  async (appContext, { token }) => {
    const transaction: TransactionRequest = await appContext
      .persistenceGateway()
      .getTransactionRequest(appContext, token);

    const completedTransaction = appContext
      .useCaseHelpers()
      .completeTransaction(transaction);

    await appContext
      .persistenceGateway()
      .saveCompletedTransaction(appContext, completedTransaction);

    const response: CompleteOnlineCollectionWithDetailsResponse = pick(
      completedTransaction,
      [
        "paygov_tracking_id",
        "agency_tracking_id",
        "transaction_amount",
        "transaction_type",
        "transaction_date",
        "payment_date",
        "transaction_status",
        "payment_type",
      ]
    );

    return appContext.useCaseHelpers().buildXml({
      response,
      responseType: "completeOnlineCollectionWithDetailsResponse",
    });
  };
