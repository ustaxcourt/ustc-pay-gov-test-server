import { Response } from "express";

export const handleLambdaError = (
  err: any
): AWSLambda.APIGatewayProxyResult => {
  const textHeaders = { "Content-Type": "text/plain; charset=UTF-8" };

  console.error(`responding with an error`, err);
  const statusCode =
    typeof err?.statusCode === "number" &&
    err.statusCode >= 100 &&
    err.statusCode <= 599
      ? err.statusCode
      : 500;
  const message =
    typeof err?.message === "string"
      ? err.message
      : typeof err === "string"
        ? err
        : "Internal Server Error";

  return {
    statusCode,
    body: message,
    headers: textHeaders,
  };
};

export const handleLocalError = (err: any, res: Response) => {
  console.error(`responding with an error:`, err.message);
  const statusCode = err.statusCode || 500;

  res.status(statusCode).send(err.message);
};
