import { v4 as uuidv4 } from "uuid";
import { getTransaction } from "../persistence/getCompletedTransaction";
import { saveCompletedTransaction } from "../persistence/saveCompletedTransaction";
import { buildXml } from "../useCaseHelpers/buildXml";
import { getTransactionRequest } from "../persistence/getTransactionRequest";
import { CompletedTransaction } from "../types/Transaction";

export async function handleCompleteOnlineCollection({
  token,
}: {
  token: string;
}): Promise<string> {
  const transaction = await getTransactionRequest(token);

  const completedTransaction: CompletedTransaction = {
    ...transaction,
    paid: true,
    paygov_tracking_id: uuidv4(),
  };

  await saveCompletedTransaction(completedTransaction);

  const respObj = {
    "S:Envelope": {
      "S:Header": {
        "work:WorkContext": {
          "#text":
            "rO0ABXd5ACl3ZWJsb2dpYy5hcHAudGNzb25saW5lLWF wcC02LjAuMC1TTkFQU0hPVAAAANYAAAAjd2VibG9naWMud29ya2FyZWEuU3RyaW5nV29ya0NvbnRleHQAH3Y2LjAuMC1TTkFQU 0hPVF8yMDE1XzEwXzE0XzIyMzgAAA==",
          "@xmlns:work": "http://oracle.com/weblogic/soap/workarea/",
        },
      },
      "S:Body": {
        "ns2:completeOnlineCollectionResponse": {
          completeOnlineCollectionResponse: {
            paygov_tracking_id: completedTransaction.paygov_tracking_id,
          },
          "@xmlns:ns2": "http://fms.treas.gov/services/tcsonline",
        },
      },
      "@xmlns:S": "http://schemas.xmlsoap.org/soap/envelope/",
    },
  };

  return buildXml(respObj);
}
