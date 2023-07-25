import type { CompletedTransaction } from "../types/Transaction";
import type { AppContext } from "../types/AppContext";

export type SaveCompletedTransaction = (
  appContext: AppContext,
  transaction: CompletedTransaction
) => Promise<void>;

export const saveCompletedTransaction: SaveCompletedTransaction = async (
  appContext,
  transaction
) => {
  await appContext.storageClient().saveFile(appContext, {
    key: `transactions/${transaction.paygov_tracking_id}.json`,
    data: JSON.stringify(transaction),
  });
};
