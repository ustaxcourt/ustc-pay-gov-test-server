import { XMLParser } from "fast-xml-parser";
import { Request, Response } from "express";
import { createAppContext } from "../appContext";
import { xmlOptions } from "../xmlOptions";
const parser = new XMLParser(xmlOptions);

const appContext = createAppContext();

async function handleSoapRequest(soapRequest: string): Promise<string> {
  console.log({ soapRequest });

  const jObj = parser.parse(soapRequest);
  const headers = jObj["S:Envelope"]["S:Header"];
  if (
    !headers.Authentication ||
    headers.Authentication !== process.env.ACCESS_TOKEN
  ) {
    throw "missing authorization";
  }

  const requestData = jObj["S:Envelope"]["S:Body"];
  const actionKey = Object.keys(requestData)[0];

  switch (actionKey) {
    case "tns:startOnlineCollection":
      return appContext
        .useCases()
        .handleStartOnlineCollection(
          appContext,
          requestData[actionKey]["tns:startOnlineCollectionRequest"]
        );

    case "tns:completeOnlineCollection":
      return appContext
        .useCases()
        .handleCompleteOnlineCollection(
          appContext,
          requestData[actionKey]["tns:completeOnlineCollectionRequest"]
        );

    default:
      throw "Not found";
  }
}

export async function handleSoapRequestLambda(req: Request, res: Response) {
  const result = await handleSoapRequest(req.body);
  res.send(result);
}

export async function handler(
  event: AWSLambda.APIGatewayProxyEvent
): Promise<AWSLambda.APIGatewayProxyResult> {
  const soapRequest = event.body;
  if (!soapRequest) {
    return {
      statusCode: 400,
      body: "missing SOAP request",
    };
  }
  try {
    const result = await handleSoapRequest(soapRequest);
    return {
      statusCode: 200,
      body: result,
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: "Unlucky",
    };
  }
}
