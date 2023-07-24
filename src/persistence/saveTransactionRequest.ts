import type { AppContext } from "../types/AppContext";
import type { TransactionRequest } from "../types/Transaction";

export type SaveTransactionRequest = (
  appContext: AppContext,
  transactionRequest: TransactionRequest
) => Promise<void>;

export const saveTransactionRequest: SaveTransactionRequest = async (
  appContext,
  transactionRequest
) => {
  await appContext.storageClient().saveFile({
    key: `requests/${transactionRequest.token}.json`,
    data: JSON.stringify(transactionRequest),
  });
};
