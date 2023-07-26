import { CompleteOnlineCollectionResponse } from "../useCases/handleCompleteOnlineCollection";
import { CompleteOnlineCollectionWithDetailsResponse } from "../useCases/handleCompleteOnlineCollectionWithDetails";
import { GetDetailsResponse } from "../useCases/handleGetDetails";
import { StartOnlineCollectionResponse } from "../useCases/handleStartOnlineCollection";
import { xmlOptions } from "../xmlOptions";
import { XMLBuilder } from "fast-xml-parser";

export type ResponseType =
  | "getDetailsResponse"
  | "startOnlineCollectionResponse"
  | "completeOnlineCollectionWithDetailsResponse"
  | "completeOnlineCollectionResponse";

export type SoapResponse =
  | CompleteOnlineCollectionResponse
  | CompleteOnlineCollectionWithDetailsResponse
  | GetDetailsResponse
  | StartOnlineCollectionResponse;

export type BuildXml = ({
  responseType,
  response,
}: {
  responseType: ResponseType;
  response: SoapResponse;
}) => string;

export const buildXml: BuildXml = ({ responseType, response }) => {
  const formattedResponse = {
    [`ns2:${responseType}`]: {
      [responseType]: response,
      "@xmlns:ns2": "http://fms.treas.gov/services/tcsonline",
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
      "S:Body": formattedResponse,
      "@xmlns:S": "http://schemas.xmlsoap.org/soap/envelope/",
    },
  };

  const builder = new XMLBuilder(xmlOptions);
  return builder.build(respObj);
};
