import { CompletedTransaction } from "../types/Transaction";

export async function getCompletedTransaction(
  appContext: any,
  payGovTrackingId: string
): Promise<CompletedTransaction> {
  const contents = await appContext
    .storageClient()
    .getFile(`transactions/${payGovTrackingId}.json`);
  const transaction = JSON.parse(contents) as CompletedTransaction;
  return transaction;
}
