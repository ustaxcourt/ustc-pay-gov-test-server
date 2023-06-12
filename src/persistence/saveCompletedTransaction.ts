import { CompletedTransaction } from "../types/Transaction";

export async function saveCompletedTransaction(
  appContext: any,
  transaction: CompletedTransaction
) {
  appContext.storageClient().saveFile({
    key: `transactions/${transaction.paygov_tracking_id}.json`,
    data: JSON.stringify(transaction),
  });
}
