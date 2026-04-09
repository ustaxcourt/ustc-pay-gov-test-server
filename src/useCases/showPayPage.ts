import { AppContext } from "../types/AppContext";
import { InvalidRequestError } from "../errors/InvalidRequestError";

export type ShowPayPage = (
  appContext: AppContext,
  { token }: { token: string }
) => Promise<string>;

export const showPayPage: ShowPayPage = async (appContext, { token }) => {
  console.log("handling a pay page", token);
  if (!token) {
    throw new InvalidRequestError("Token not found");
  }
  const transactionRequest = await appContext
    .persistenceGateway()
    .getInitiatedTransaction(appContext, token);

  const html = await appContext
    .storageClient()
    .getFile(appContext, "html/pay.html");

  return html
    .replaceAll("%%urlSuccess%%", transactionRequest.url_success)
    .replaceAll("%%urlCancel%%", transactionRequest.url_cancel);
};
