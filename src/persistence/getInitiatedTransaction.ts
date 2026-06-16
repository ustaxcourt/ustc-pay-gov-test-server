import type { AppContext } from "../types/AppContext";
import type { InitiatedTransaction } from "../types/Transaction";
import { withRetry } from "../useCaseHelpers/withRetry";

export type GetInitiatedTransaction = (
  appContext: AppContext,
  token: string,
) => Promise<InitiatedTransaction>;

export const getInitiatedTransaction: GetInitiatedTransaction = async (
  appContext,
  token,
) => {
  const data = await withRetry(() =>
    appContext.storageClient().getFile(appContext, `requests/${token}.json`),
  );

  const transactionRequest = JSON.parse(data) as InitiatedTransaction;
  return transactionRequest;
};
