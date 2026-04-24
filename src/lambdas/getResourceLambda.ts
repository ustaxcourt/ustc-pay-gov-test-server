import { Request, Response } from "express";
import { createAppContext } from "../appContext";
import { handleLambdaError, handleLocalError } from "./handleError";
import { authenticateRequest } from "./authenticateRequest";
import { AppContext } from "../types/AppContext";

export const lambdaAppContext = createAppContext();

export const getResource = async (
  appContext: AppContext,
  filename?: string,
) => {
  return appContext.useCases().getResource(appContext, { filename });
};

export const getResourceLocal = async (req: Request, res: Response) => {
  try {
    authenticateRequest(req.headers);

    const result = await getResource(res.locals.appContext, req.params.file);
    res.send(result);
  } catch (err) {
    handleLocalError(err, res);
  }
};

export const handler = async (
  event: AWSLambda.APIGatewayProxyEvent,
): Promise<AWSLambda.APIGatewayProxyResult> => {
  const textHeaders = { "Content-Type": "text/plain; charset=UTF-8" };
  try {
    authenticateRequest(event.headers);
    const result = await getResource(
      lambdaAppContext,
      event.pathParameters?.filename,
    );
    return {
      statusCode: 200,
      body: result,
      headers: textHeaders,
    };
  } catch (err) {
    return handleLambdaError(err);
  }
};
