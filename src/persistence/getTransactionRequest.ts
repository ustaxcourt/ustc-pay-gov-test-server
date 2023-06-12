import { TransactionRequest } from "../types/Transaction";

export async function getTransactionRequest(
  appContext: any,
  token: string
): Promise<TransactionRequest> {
  const data = await appContext
    .storageClient()
    .getFile(`requests/${token}.json`);

  const transactionRequest = JSON.parse(data) as TransactionRequest;
  return transactionRequest;
}
