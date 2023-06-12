import { XMLParser } from "fast-xml-parser";
import { Request, Response } from "express";
import { createAppContext } from "../appContext";
import { TransactionRequest } from "../types/Transaction";
import { CompleteTransactionRequest } from "../useCases/handleCompleteOnlineCollection";
import { xmlOptions } from "../xmlOptions";
const parser = new XMLParser(xmlOptions);

const appContext = createAppContext();

export async function handleSoapRequestLambda(req: Request, res: Response) {
  const jObj = parser.parse(req.body);

  const requestData = jObj["soap:Envelope"]["soap:Body"];
  const actionKey = Object.keys(requestData)[0];
  let result;

  switch (actionKey) {
    case "tns:startOnlineCollection":
      result = appContext
        .useCases()
        .handleStartOnlineCollection(
          appContext,
          requestData[actionKey]["tns:startOnlineCollectionRequest"]
        );
      break;

    case "tns:completeOnlineCollection":
      result = appContext
        .useCases()
        .handleStartOnlineCollection(
          appContext,
          requestData[actionKey]["tns:completeOnlineCollectionRequest"]
        );

    default:
      throw "Not found";
  }

  res.send(result);
}
