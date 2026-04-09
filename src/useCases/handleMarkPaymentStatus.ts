import { DateTime } from "luxon";
import { AppContext } from "../types/AppContext";
import { InitiatedTransaction, PaymentStatus, PaymentType } from "../types/Transaction";

export type HandleMarkPaymentStatus = (
  appContext: AppContext,
  {
    token,
    paymentMethod,
    paymentStatus,
  }: { token: string; paymentMethod: PaymentType; paymentStatus: PaymentStatus }
) => Promise<string>;


export const handleMarkPaymentStatus: HandleMarkPaymentStatus = async (
  appContext,
  { token, paymentMethod, paymentStatus }
) => {
  const transaction = await appContext
    .persistenceGateway()
    .getInitiatedTransaction(appContext, token);

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
