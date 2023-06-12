import { getFileFromS3 } from "../persistence/getFileFromS3";
import { getTransactionRequest } from "../persistence/getTransactionRequest";
import { CompletedTransaction } from "../types/Transaction";

export async function showPayPage(req: any, res: any) {
  console.log("handling a pay page", req.query.token);
  const transactionRequest = await getTransactionRequest(req.query.token);
  console.log(transactionRequest);

  const html = await getFileFromS3("html/pay.html");
  console.log(html);
  console.log(transactionRequest);
  res.send(
    html
      .replace("%%urlSuccess%%", transactionRequest.url_success)
      .replace("%%urlCancel%%", transactionRequest.url_cancel)
  );
}
