import { Request, Response } from "express";
import { createAppContext } from "../appContext";
import { handleLambdaError, handleLocalError } from "./handleError";
import { authenticateRequest } from "./authenticateRequest";
import { AppContext } from "../types/AppContext";

const getResource = async (appContext: AppContext, filename?: string) => {
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
  event: AWSLambda.APIGatewayProxyEvent
): Promise<AWSLambda.APIGatewayProxyResult> => {
  const appContext = createAppContext();
  try {
    authenticateRequest(event.headers);
    const result = await getResource(
      appContext,
      event.pathParameters?.filename
    );
    return {
      statusCode: 200,
      body: result,
    };
  } catch (err) {
    return handleLambdaError(err);
  }
};
