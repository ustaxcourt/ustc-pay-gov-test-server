import { TransactionRequest } from "../types/Transaction";

export async function saveTransactionRequest(
  appContext: any,
  transactionRequest: TransactionRequest
) {
  const res = await appContext.storageClient().saveFile({
    key: `requests/${transactionRequest.token}.json`,
    data: JSON.stringify(transactionRequest),
  });
  return res;
}
