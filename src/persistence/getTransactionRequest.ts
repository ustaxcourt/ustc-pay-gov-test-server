import type { AppContext } from "../types/AppContext";
import type { TransactionRequest } from "../types/Transaction";

export type GetTransactionRequest = (
  appContext: AppContext,
  token: string
) => Promise<TransactionRequest>;

export const getTransactionRequest: GetTransactionRequest = async (
  appContext,
  token
) => {
  const data = await appContext
    .storageClient()
    .getFile(`requests/${token}.json`);

  const transactionRequest = JSON.parse(data) as TransactionRequest;
  return transactionRequest;
};
