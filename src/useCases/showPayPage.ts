import { AppContext } from "../types/AppContext";

export type ShowPayPage = (
  appContext: AppContext,
  { token }: { token: string }
) => Promise<string>;

export const showPayPage: ShowPayPage = async (appContext, { token }) => {
  console.log("handling a pay page", token);
  if (!token) {
    throw "Token not found";
  }
  const transactionRequest = await appContext
    .persistenceGateway()
    .getTransactionRequest(appContext, token);

  const html = await appContext
    .storageClient()
    .getFile(appContext, "html/pay.html");

  return html
    .replace("%%urlSuccess%%", transactionRequest.url_success)
    .replace("%%urlCancel%%", transactionRequest.url_cancel);
};
