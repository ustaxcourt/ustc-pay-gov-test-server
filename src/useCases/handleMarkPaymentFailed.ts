import { InvalidRequestError } from "../errors/InvalidRequestError";
import { AppContext } from "../types/AppContext";

export type HandleMarkPaymentFailed = (
  appContext: AppContext,
  { token }: { token: string }
) => Promise<void>;

export const handleMarkPaymentFailed: HandleMarkPaymentFailed = async (
  appContext,
  { token }
) => {
  const transaction = await appContext
    .persistenceGateway()
    .getInitiatedTransaction(appContext, token);

  if (transaction.failed_payment) {
    throw new InvalidRequestError("Token already marked failed");
  }

  await appContext.persistenceGateway().saveInitiatedTransaction(appContext, {
    ...transaction,
    failed_payment: true,
  });
};
