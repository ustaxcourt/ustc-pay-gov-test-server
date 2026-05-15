import { Request, Response } from "express";
import { createAppContext } from "../appContext";
import { AppContext } from "../types/AppContext";
import { handleLambdaError, handleLocalError } from "./handleError";
import { MissingTokenError } from "../errors/MissingTokenError";

export const lambdaAppContext = createAppContext();

async function getPayPage(appContext: AppContext, token: string) {
  return appContext.useCases().showPayPage(appContext, { token });
}

export async function getPayPageLocal(req: Request, res: Response) {
  if (!req.query.token || typeof req.query.token !== "string") {
    return handleLocalError(new MissingTokenError(), res);
  }
  const result = await getPayPage(res.locals.appContext, req.query.token);
  res.send(result);
}

export async function handler(
  event: AWSLambda.APIGatewayProxyEvent,
): Promise<AWSLambda.APIGatewayProxyResult> {
  if (
    !event.queryStringParameters?.token ||
    typeof event.queryStringParameters.token !== "string"
  ) {
    return new MissingTokenError();
  }
  try {
    const result = await getPayPage(
      lambdaAppContext,
      event.queryStringParameters.token,
    );
    return {
      statusCode: 200,
      body: result,
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    };
  } catch (err) {
    return handleLambdaError(err);
  }
}
