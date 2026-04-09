import type { AppContext } from "../types/AppContext";
import type { InitiatedTransaction } from "../types/Transaction";

export type SaveInitiatedTransaction = (
  appContext: AppContext,
  initiatedTransaction: InitiatedTransaction
) => Promise<void>;

export const saveInitiatedTransaction: SaveInitiatedTransaction = async (
  appContext,
  initiatedTransaction
) => {
  await appContext.storageClient().saveFile(appContext, {
    key: `requests/${initiatedTransaction.token}.json`,
    data: JSON.stringify(initiatedTransaction),
  });
};
