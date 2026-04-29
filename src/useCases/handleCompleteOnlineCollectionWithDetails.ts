import { AppContext } from "../types/AppContext";
import { MissingTokenError } from "../errors/MissingTokenError";
import { pick } from "lodash";
import {
  InitiatedTransaction,
  PaymentFrequencyType,
  PaymentType,
  TransactionType,
} from "../types/Transaction";
import { CompleteTransactionRequest } from "../types/CompleteTransactionRequest";
import { TransactionStatus } from "../types/TransactionStatus";
import { resolveTransactionStatus } from "../useCaseHelpers/resolveTransactionStatus";
import { MissingTcsAppIdError } from "../errors/MissingTcsAppIdError";

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

export type HandleCompleteOnlineCollectionWithDetails = (
  appContext: AppContext,
  request: CompleteTransactionRequest,
) => Promise<string>;

export const handleCompleteOnlineCollectionWithDetails: HandleCompleteOnlineCollectionWithDetails =
  async (appContext, request) => {
    if (!request.token) {
      throw new MissingTokenError();
    }

    if (!request.tcs_app_id) {
      throw new MissingTcsAppIdError();
    }

    const token = request.token;

    const transaction: InitiatedTransaction = await appContext
      .persistenceGateway()
      .getInitiatedTransaction(appContext, token);

    const transactionStatus: TransactionStatus =
      resolveTransactionStatus(transaction);

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
      ]),
    };

    return appContext.useCaseHelpers().buildXml({
      response,
      responseType: "completeOnlineCollectionWithDetailsResponse",
    });
  };
