import { v4 as uuidv4 } from "uuid";
import { buildXml } from "../useCaseHelpers/buildXml";
import { CompletedTransaction } from "../types/Transaction";
import { CompleteTransactionRequest } from "../types/CompleteTransactionRequest";
import { AppContext } from "../types/AppContext";

export type HandleCompleteOnlineCollection = (
  appContext: AppContext,
  { token }: CompleteTransactionRequest
) => Promise<string>;

export const handleCompleteOnlineCollection: HandleCompleteOnlineCollection =
  async (appContext, { token }) => {
    const transaction = await appContext
      .persistenceGateway()
      .getTransactionRequest(appContext, token);

    const completedTransaction: CompletedTransaction = {
      ...transaction,
      paid: true,
      paygov_tracking_id: uuidv4(),
    };

    await appContext
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
              paygov_tracking_id: completedTransaction.paygov_tracking_id,
            },
            "@xmlns:ns2": "http://fms.treas.gov/services/tcsonline",
          },
        },
        "@xmlns:S": "http://schemas.xmlsoap.org/soap/envelope/",
      },
    };

    return buildXml(respObj);
  };
