import { Request, Response } from "express";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createAppContext } from "../appContext";
import { handleLambdaError, handleLocalError } from "./handleError";
import { NotFoundError } from "../errors/NotFoundError";

export const lambdaAppContext = createAppContext();

export const getScriptLocal = async (req: Request, res: Response) => {
  const scriptHeaders = { "Content-Type": "application/javascript" };
  const filename = req.params.file || "";

  try {
    if (!filename) {
      throw new NotFoundError("File not found");
    }

    const content = await res.locals.appContext
      .useCases()
      .showScript(res.locals.appContext, { file: filename });
    res.set(scriptHeaders).send(content);
  } catch (err: any) {
    handleLocalError(err, res);
  }
};

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const scriptHeaders = { "Content-Type": "application/javascript" };
  const filename = event.pathParameters?.file || "";

  try {
    const content = await lambdaAppContext
      .useCases()
      .showScript(lambdaAppContext, { file: filename });
    return {
      statusCode: 200,
      body: content,
      headers: scriptHeaders,
    };
  } catch (err: any) {
    return handleLambdaError(err);
  }
}
