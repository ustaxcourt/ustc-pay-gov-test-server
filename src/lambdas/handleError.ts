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

  let message: string;
  if (statusCode >= 500) {
    // Only log server errors
    console.error(`responding with an error`, err);
    message = "Internal Server Error";
  } else {
    message =
      typeof err?.message === "string"
        ? err.message
        : typeof err === "string"
        ? err
        : "Error";
  }

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
