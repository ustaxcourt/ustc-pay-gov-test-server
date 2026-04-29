import { CompleteTransactionRequest } from "../types/CompleteTransactionRequest";
import { AppContext } from "../types/AppContext";
import { MissingTokenError } from "../errors/MissingTokenError";
import { MissingTcsAppIdError } from "../errors/MissingTcsAppIdError";

export type CompleteOnlineCollectionResponse = {
  paygov_tracking_id: string;
};

export type HandleCompleteOnlineCollection = (
  appContext: AppContext,
  request: CompleteTransactionRequest,
) => Promise<string>;

export const handleCompleteOnlineCollection: HandleCompleteOnlineCollection =
  async (appContext, request) => {
    if (!request.token) {
      throw new MissingTokenError();
    }

    if (!request.tcs_app_id) {
      throw new MissingTcsAppIdError();
    }

    const token = request.token;

    const transaction = await appContext
      .persistenceGateway()
      .getInitiatedTransaction(appContext, token);

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
