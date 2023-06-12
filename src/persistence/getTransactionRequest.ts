import { TransactionRequest } from "../types/Transaction";
import { getFileFromS3 } from "./getFileFromS3";

export async function getTransactionRequest(
  token: string
): Promise<TransactionRequest> {
  const data = await getFileFromS3(`requests/${token}.json`);
  const transactionRequest = JSON.parse(data) as TransactionRequest;
  return transactionRequest;
}
