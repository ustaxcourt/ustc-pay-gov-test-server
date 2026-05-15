import { Response } from "express";

export const handleLambdaError = (
  err: any,
): AWSLambda.APIGatewayProxyResult => {
  const textHeaders = { "Content-Type": "text/plain; charset=UTF-8" };
  const statusCode =
    typeof err?.statusCode === "number" &&
    err.statusCode >= 100 &&
    err.statusCode <= 599
      ? err.statusCode
      : 500;
  const headers =
    err?.headers && typeof err.headers === "object" ? err.headers : textHeaders;

  const structuredBody = typeof err?.body === "string" ? err.body : undefined;

  let message: string;
  if (statusCode >= 500) {
    // Only log server errors
    console.error(`responding with an error`, err);
    message = "Internal Server Error";
  } else {
    message =
      typeof structuredBody === "string"
        ? structuredBody
        : typeof err?.message === "string"
        ? err.message
        : typeof err === "string"
        ? err
        : "Error";
  }

  return {
    statusCode,
    body: message,
    headers,
  };
};

export const handleLocalError = (err: any, res: Response) => {
  console.error(`responding with an error:`, err.message);

  const statusCode = err?.statusCode || 500;
  const headers = err?.headers;
  const body =
    typeof err?.body === "string"
      ? err.body
      : typeof err?.message === "string"
      ? err.message
      : "Error";

  if (headers && typeof headers === "object") {
    res.set(headers);
  } else {
    res.set("Content-Type", "text/plain; charset=UTF-8");
  }

  res.status(statusCode).send(body);
};
