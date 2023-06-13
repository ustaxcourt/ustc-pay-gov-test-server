import { Request, Response } from "express";
import { createAppContext } from "../appContext";

async function getPayPage(token: string) {
  const appContext = createAppContext();
  return appContext.useCases().showPayPage(appContext, { token });
}

export async function getPayPageLambda(req: Request, res: Response) {
  if (!req.query.token || typeof req.query.token !== "string") {
    return res.send("no token found");
  }
  const result = await getPayPage(req.query.token);
  res.send(result);
}

export async function handler(
  event: AWSLambda.APIGatewayProxyEvent
): Promise<AWSLambda.APIGatewayProxyResult> {
  if (
    !event.queryStringParameters?.token ||
    typeof event.queryStringParameters.token !== "string"
  ) {
    return {
      statusCode: 400,
      body: "No token found",
    };
  }
  try {
    const result = await getPayPage(event.queryStringParameters.token);
    return {
      statusCode: 200,
      body: result,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
      },
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: "error has occurred",
    };
  }
}
