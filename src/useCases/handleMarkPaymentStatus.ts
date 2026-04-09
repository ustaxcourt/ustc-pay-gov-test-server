import { DateTime } from "luxon";
import { AppContext } from "../types/AppContext";
import { InitiatedTransaction, PaymentType } from "../types/Transaction";
import { InvalidRequestError } from "../errors/InvalidRequestError";

const VALID_PAYMENT_METHODS: PaymentType[] = ["PLASTIC_CARD", "ACH", "AMAZON", "PAYPAL"];
const VALID_PAYMENT_STATUSES = ["Success", "Failed"] as const;
type ValidPaymentStatus = (typeof VALID_PAYMENT_STATUSES)[number];

export type HandleMarkPaymentStatus = (
  appContext: AppContext,
  {
    token,
    paymentMethod,
    paymentStatus,
  }: { token: string; paymentMethod: string; paymentStatus: string }
) => Promise<string|undefined>;

export const handleMarkPaymentStatus: HandleMarkPaymentStatus = async (
  appContext,
  { token, paymentMethod, paymentStatus }
) => {
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod as PaymentType)) {
    throw new InvalidRequestError(`Unknown payment method: ${paymentMethod}`);
  }
  if (!VALID_PAYMENT_STATUSES.includes(paymentStatus as ValidPaymentStatus)) {
    throw new InvalidRequestError(`Unknown payment status: ${paymentStatus}`);
  }

  const validatedMethod = paymentMethod as PaymentType;
  const validatedStatus = paymentStatus as ValidPaymentStatus;
  const transaction = await appContext
    .persistenceGateway()
    .getInitiatedTransaction(appContext, token);

  if (transaction.failed_payment) {
    throw new InvalidRequestError("Token already marked failed");
    return;
  }

  const isFailed = validatedStatus === "Failed";
  const isAchSuccess = validatedMethod === "ACH" && !isFailed;

  const updatedTransaction: InitiatedTransaction = {
    ...transaction,
    payment_type: validatedMethod,
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
