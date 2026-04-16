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
) => Promise<string>;

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

  if (transaction.paypal_initiated_at) {
    throw new InvalidRequestError("Token already marked as PAYPAL");
  }

  const isFailed = paymentStatus === "Failed";
  const isAch = paymentMethod === "ACH";
  const isPaypal = paymentMethod === "PAYPAL";

  const updatedTransaction: InitiatedTransaction = {
    ...transaction,
    payment_type: paymentMethod,
    ...(isFailed && { failed_payment: true }),
    ...(isAch && {
      ach_initiated_at: DateTime.now().toJSDate().toISOString(),
    }),
    ...(isPaypal && {
      paypal_initiated_at: DateTime.now().toJSDate().toISOString(),
    }),
  };

  await appContext
    .persistenceGateway()
    .saveInitiatedTransaction(appContext, updatedTransaction);

  return updatedTransaction.url_success;
};
