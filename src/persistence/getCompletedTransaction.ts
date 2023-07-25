import type { AppContext } from "../types/AppContext";
import type { CompletedTransaction } from "../types/Transaction";

export type GetCompletedTransaction = (
  appContext: AppContext,
  payGovTrackingId: string
) => Promise<CompletedTransaction>;

export const getCompletedTransaction: GetCompletedTransaction = async (
  appContext,
  payGovTrackingId
) => {
  const contents = await appContext
    .storageClient()
    .getFile(appContext, `transactions/${payGovTrackingId}.json`);
  const transaction = JSON.parse(contents) as CompletedTransaction;
  return transaction;
};
