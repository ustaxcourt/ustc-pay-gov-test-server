import { XMLParser } from "fast-xml-parser";
import { Request, Response } from "express";
import { createAppContext } from "../appContext";
import { xmlOptions } from "../xmlOptions";
import { authenticateRequest } from "./authenticateRequest";
import { handleLambdaError, handleLocalError } from "./handleError";
import { InvalidRequestError } from "../errors/InvalidRequestError";

const parser = new XMLParser(xmlOptions);
const appContext = createAppContext();

async function handleSoapRequest(soapRequest: string): Promise<string> {
  const jObj = parser.parse(soapRequest);

  const requestData = jObj["soapenv:Envelope"]["soapenv:Body"];
  const actionKey = Object.keys(requestData)[0];

  switch (actionKey) {
    case "tcs:startOnlineCollection":
      return appContext
        .useCases()
        .handleStartOnlineCollection(
          appContext,
          requestData[actionKey]["startOnlineCollectionRequest"]
        );

    case "tcs:completeOnlineCollection":
      return appContext
        .useCases()
        .handleCompleteOnlineCollection(
          appContext,
          requestData[actionKey]["completeOnlineCollectionRequest"]
        );

    case "tcs:completeOnlineCollectionWithDetails":
      return appContext
        .useCases()
        .handleCompleteOnlineCollectionWithDetails(
          appContext,
          requestData[actionKey]["completeOnlineCollectionWithDetailsRequest"]
        );

    default:
      throw new InvalidRequestError("Could not find correct API");
  }
}

export async function handleSoapRequestLocal(req: Request, res: Response) {
  try {
    authenticateRequest(req.headers);
    const result = await handleSoapRequest(req.body);
    res.send(result);
  } catch (err) {
    handleLocalError(err, res);
  }
}

export const parseRequest = (requestBody?: string | null) => {
  if (!requestBody) {
    throw new InvalidRequestError("Missing body");
  }
};

export const handler = async (
  event: AWSLambda.APIGatewayProxyEvent
): Promise<AWSLambda.APIGatewayProxyResult> => {
  try {
    authenticateRequest(event.headers);
    parseRequest(event.body);

    const soapRequest = event.body;

    const result = await handleSoapRequest(soapRequest!);
    return {
      statusCode: 200,
      body: result,
    };
  } catch (err) {
    return handleLambdaError(err);
  }
};
