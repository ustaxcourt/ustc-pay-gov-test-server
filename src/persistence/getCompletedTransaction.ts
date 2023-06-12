import { getFileFromS3 } from "./getFileFromS3";
import { CompletedTransaction } from "../types/Transaction";

export async function getTransaction(
  payGovTrackingId: string
): Promise<CompletedTransaction> {
  const contents = await getFileFromS3(`transactions/${payGovTrackingId}.json`);
  const transaction = JSON.parse(contents) as CompletedTransaction;
  return transaction;
}
