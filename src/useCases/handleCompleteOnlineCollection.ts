import { CompleteTransactionRequest } from "../types/CompleteTransactionRequest";
import { AppContext } from "../types/AppContext";

export type CompleteOnlineCollectionResponse = {
  paygov_tracking_id: string;
};

export type HandleCompleteOnlineCollection = (
  appContext: AppContext,
  { token }: CompleteTransactionRequest
) => Promise<string>;

export const handleCompleteOnlineCollection: HandleCompleteOnlineCollection =
  async (appContext, { token }) => {
    const transaction = await appContext
      .persistenceGateway()
      .getTransactionRequest(appContext, token);

    const completedTransaction = appContext
      .useCaseHelpers()
      .completeTransaction(transaction);

    await appContext
      .persistenceGateway()
      .saveCompletedTransaction(appContext, completedTransaction);

    const response: CompleteOnlineCollectionResponse = {
      paygov_tracking_id: completedTransaction.paygov_tracking_id,
    };

    return appContext.useCaseHelpers().buildXml({
      response,
      responseType: "completeOnlineCollectionResponse",
    });
  };
