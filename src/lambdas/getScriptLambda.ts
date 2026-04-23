import { Request, Response } from "express";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createAppContext } from "../appContext";

export const lambdaAppContext = createAppContext();

export const getScriptLocal = async (req: Request, res: Response) => {
  const scriptHeaders = { "Content-Type": "application/javascript" };
  const textHeaders = { "Content-Type": "text/plain; charset=UTF-8" };
  const filename = req.params.file || "";

  try {
    const content = await res.locals.appContext.useCases().showScript(res.locals.appContext, { file: filename });
    res.set(scriptHeaders).send(content);
  } catch (err: any) {
    const statusCode = typeof err?.statusCode === "number" ? err.statusCode : 404;
    const message =
      statusCode >= 500
        ? "error has occurred"
        : err?.message || "File not found";
    if (statusCode >= 500) {
      console.error(err);
    }
    res.status(statusCode).set(textHeaders).send(message);
  }
};

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const scriptHeaders = { "Content-Type": "application/javascript" };
  const textHeaders = { "Content-Type": "text/plain; charset=UTF-8" };

  const filename = event.pathParameters?.file || "";

  try {
    const content = await lambdaAppContext.useCases().showScript(lambdaAppContext, { file: filename });
    return {
      statusCode: 200,
      body: content,
      headers: scriptHeaders,
    };
  } catch (err: any) {
    const statusCode = typeof err?.statusCode === "number" ? err.statusCode : 404;
    const message =
      statusCode >= 500
        ? "error has occurred"
        : err?.message || "File not found";
    if (statusCode >= 500) {
      console.error(err);
    }
    return {
      statusCode,
      body: message,
      headers: textHeaders,
    };
  }
}
