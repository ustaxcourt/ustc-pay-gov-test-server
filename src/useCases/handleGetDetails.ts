import { AppContext } from "../types/AppContext";
import { PaymentFrequencyType, PaymentType, TransactionType } from "../types/Transaction";
import { TransactionStatus } from "../types/TransactionStatus";

export type GetDetailsRequest = {
  paygov_tracking_id: string;
};

export type TransactionDetails = {
  transaction: {
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
};

export type GetDetailsResponse = {
  transactions: TransactionDetails[];
};

export type HandleGetDetails = (
  appContext: AppContext,
  { paygov_tracking_id }: GetDetailsRequest
) => Promise<string>;

export const handleGetDetails: HandleGetDetails = async (
  appContext,
  { paygov_tracking_id }
) => {
  const completedTransaction = await appContext
    .persistenceGateway()
    .getCompletedTransaction(appContext, paygov_tracking_id);

  const getDetailsResponse: GetDetailsResponse = {
    transactions: [
      {
        transaction: {
          paygov_tracking_id: completedTransaction.paygov_tracking_id,
          agency_tracking_id: completedTransaction.agency_tracking_id,
          transaction_amount: completedTransaction.transaction_amount,
          transaction_type: completedTransaction.transaction_type,
          transaction_date: completedTransaction.transaction_date,
          payment_date: completedTransaction.payment_date,
          transaction_status: completedTransaction.transaction_status,
          payment_type: completedTransaction.payment_type,
          payment_frequency: completedTransaction.payment_frequency,
          number_of_installments: completedTransaction.number_of_installments,
        },
      },
    ],
  };

  return appContext.useCaseHelpers().buildXml({
    response: getDetailsResponse,
    responseType: "getDetailsResponse",
  });
};
