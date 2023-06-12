import { CompletedTransaction } from "../types/Transaction";
import { saveFileToS3 } from "./saveFileToS3";

export async function saveCompletedTransaction(
  transaction: CompletedTransaction
) {
  await saveFileToS3({
    key: `transactions/${transaction.paygov_tracking_id}.json`,
    data: JSON.stringify(transaction),
  });
}
