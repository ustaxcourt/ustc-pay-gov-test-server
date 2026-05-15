import { randomUUID } from "node:crypto";
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
  // build token (Strip the - from the uuid to get us to exactly 32 characters)
  const token = randomUUID().replace(/-/g, "");

  // persist token
  await appContext.persistenceGateway().saveInitiatedTransaction(appContext, {
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
