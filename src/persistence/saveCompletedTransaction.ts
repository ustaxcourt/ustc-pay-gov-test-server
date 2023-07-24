import type { CompletedTransaction } from "../types/Transaction";
import type { AppContext } from "../types/AppContext";

export type SaveCompletedTransaction = (
  appContext: AppContext,
  transaction: CompletedTransaction
) => Promise<void>;

export const saveCompletedTransactionconst: SaveCompletedTransaction = async (
  appContext,
  transaction
) => {
  await appContext.storageClient().saveFile({
    key: `transactions/${transaction.pay_gov_tracking_id}.json`,
    data: JSON.stringify(transaction),
  });
};
