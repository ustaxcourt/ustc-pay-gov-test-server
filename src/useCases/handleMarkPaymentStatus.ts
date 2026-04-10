import { DateTime } from "luxon";
import { AppContext } from "../types/AppContext";
import { InitiatedTransaction, MarkablePaymentStatus, PaymentType } from "../types/Transaction";
import { InvalidRequestError } from "../errors/InvalidRequestError";

export type HandleMarkPaymentStatus = (
  appContext: AppContext,
  {
    token,
    paymentMethod,
    paymentStatus,
  }: { token: string; paymentMethod: PaymentType; paymentStatus: MarkablePaymentStatus },
) => Promise<string | undefined>;

export const handleMarkPaymentStatus: HandleMarkPaymentStatus = async (
  appContext,
  { token, paymentMethod, paymentStatus },
) => {
  const transaction = await appContext
    .persistenceGateway()
    .getInitiatedTransaction(appContext, token);

  if (transaction.failed_payment) {
    throw new InvalidRequestError("Token already marked failed");
  }

  if (transaction.ach_initiated_at) {
    throw new InvalidRequestError("Token already marked as ACH");
  }

  const isFailed = paymentStatus === "Failed";
  const isAchSuccess = paymentMethod === "ACH" && !isFailed;

  const updatedTransaction: InitiatedTransaction = {
    ...transaction,
    payment_type: paymentMethod,
    ...(isFailed && { failed_payment: true }),
    ...(isAchSuccess && {
      ach_initiated_at: DateTime.now().toJSDate().toISOString(),
    }),
  };

  await appContext
    .persistenceGateway()
    .saveInitiatedTransaction(appContext, updatedTransaction);

  return updatedTransaction.url_success;
};
