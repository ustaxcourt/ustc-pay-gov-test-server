import { TransactionRequest } from "../types/Transaction";
import { saveFileToS3 } from "./saveFileToS3";

export async function saveTransactionRequest(
  transactionRequest: TransactionRequest
) {
  await saveFileToS3({
    key: `requests/${transactionRequest.token}.json`,
    data: JSON.stringify(transactionRequest),
  });
}
