import { AppContext } from "../types/AppContext";
import { buildXml } from "../useCaseHelpers/buildXml";

export type GetDetailsRequest = {
  paygov_tracking_id: string;
};

export type HandleGetDetails = (
  appContext: AppContext,
  { paygov_tracking_id }: GetDetailsRequest
) => Promise<string>;

export const handleGetDetails: HandleGetDetails = async (
  appContext,
  { paygov_tracking_id }
) => {
  const completedTransaction = await appContext
    .persistenceGateway()
    .getCompletedTransaction(appContext, paygov_tracking_id);

  const response = {
    getDetailsResponse: {
      paygov_tracking_id: completedTransaction.paygov_tracking_id,
      transaction_status: "Success",
      agency_tracking_id: completedTransaction.agency_tracking_id,
      transaction_amount: completedTransaction.transaction_amount,
      payment_type: "somethbing",
      transaction_type: "something-else",
    },
  };

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
        "ns2:getDetailsResponse": response,
        "@xmlns:ns2": "http://fms.treas.gov/services/tcsonline",
      },
    },
    "@xmlns:S": "http://schemas.xmlsoap.org/soap/envelope/",
  };

  return buildXml(respObj);
};
