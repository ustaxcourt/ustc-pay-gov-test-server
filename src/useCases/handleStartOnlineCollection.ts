import { v4 as uuidv4 } from "uuid";
import { TransactionRequest } from "../types/Transaction";
import { AppContext } from "../types/AppContext";

export type StartOnlineCollectionResponse = {
  token: string;
};

export type HandleStartOnlineCollection = (
  appContext: AppContext,
  transaction: TransactionRequest
) => Promise<string>;

export const handleStartOnlineCollection: HandleStartOnlineCollection = async (
  appContext,
  transaction
) => {
  // build token
  const token = uuidv4();

  // persist token
  await appContext.persistenceGateway().saveTransactionRequest(appContext, {
    ...transaction,
    token,
  });

  const response: StartOnlineCollectionResponse = {
    token,
  };

  return appContext.useCaseHelpers().buildXml({
    response,
    responseType: "startOnlineCollectionResponse",
  });
};
