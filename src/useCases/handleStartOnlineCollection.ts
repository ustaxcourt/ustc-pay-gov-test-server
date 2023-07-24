import { v4 as uuidv4 } from "uuid";
import { TransactionRequest } from "../types/Transaction";
import { AppContext } from "../types/AppContext";

export type HandleStartOnlineCollection = (
  appContext: AppContext,
  transaction: TransactionRequest
) => Promise<string>;

export const handleStartOnlineCollection: HandleStartOnlineCollection = async (
  appContext,
  transaction
) => {
  // build token
  const token = uuidv4();

  // persist token
  await appContext.persistenceGateway().saveTransactionRequest(appContext, {
    ...transaction,
    token,
  });

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
        "ns2:startOnlineCollectionResponse": {
          startOnlineCollectionResponse: {
            token,
          },
          "@xmlns:ns2": "http://fms.treas.gov/services/tcsonline",
        },
      },
      "@xmlns:S": "http://schemas.xmlsoap.org/soap/envelope/",
    },
  };

  const xml = appContext.useCaseHelpers().buildXml(respObj);
  return xml;
};
