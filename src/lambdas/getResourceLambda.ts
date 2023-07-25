import { Request, Response } from "express";
import { createAppContext } from "../appContext";
import { handleLambdaError, handleLocalError } from "./handleError";
import { authenticateRequest } from "./authenticateRequest";

const appContext = createAppContext();

async function getResource(filename?: string) {
  return appContext.useCases().getResource(appContext, { filename });
}

export async function getResourceLocal(req: Request, res: Response) {
  try {
    authenticateRequest(req.headers);

    const result = await getResource(req.params.file);
    res.send(result);
  } catch (err) {
    handleLocalError(err, res);
  }
}

export async function handler(
  event: AWSLambda.APIGatewayProxyEvent
): Promise<AWSLambda.APIGatewayProxyResult> {
  try {
    authenticateRequest(event.headers);
    const result = await getResource(event.pathParameters?.filename);
    return {
      statusCode: 200,
      body: result,
    };
  } catch (err) {
    return handleLambdaError(err);
  }
}
