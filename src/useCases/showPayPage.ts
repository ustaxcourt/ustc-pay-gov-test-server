export async function showPayPage(
  appContext: any,
  { token }: { token?: string }
) {
  console.log("handling a pay page", token);
  if (!token) {
    throw "Token not found";
  }
  const transactionRequest = await appContext
    .persistenceGateway()
    .getTransactionRequest(appContext, token);

  const html = await appContext.storageClient().getFile("html/pay.html");

  return html
    .replace("%%urlSuccess%%", transactionRequest.url_success)
    .replace("%%urlCancel%%", transactionRequest.url_cancel);
}
