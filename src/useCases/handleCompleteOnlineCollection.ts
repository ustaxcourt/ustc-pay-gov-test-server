import { v4 as uuidv4 } from "uuid";
import { saveCompletedTransaction } from "../persistence/saveCompletedTransaction";
import { buildXml } from "../useCaseHelpers/buildXml";
import { CompletedTransaction } from "../types/Transaction";

export type CompleteTransactionRequest = {
  token: string;
};

export async function handleCompleteOnlineCollection(
  appContext: any,
  { token }: CompleteTransactionRequest
): Promise<string> {
  const transaction = await appContext
    .persistenceGateway()
    .getTransactionRequest(appContext, token);

  const completedTransaction: CompletedTransaction = {
    ...transaction,
    paid: true,
    pay_gov_tracking_id: uuidv4(),
  };

  await await appContext
    .persistenceGateway()
    .saveCompletedTransaction(appContext, completedTransaction);

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
            pay_gov_tracking_id: completedTransaction.pay_gov_tracking_id,
          },
          "@xmlns:ns2": "http://fms.treas.gov/services/tcsonline",
        },
      },
      "@xmlns:S": "http://schemas.xmlsoap.org/soap/envelope/",
    },
  };

  return buildXml(respObj);
}
