import { Response } from "express";

export const handleLambdaError = (
  err: any
): AWSLambda.APIGatewayProxyResult => {
  const textHeaders = { "Content-Type": "text/plain; charset=UTF-8" };

  console.error(`responding with an error`, err);
  if (err.statusCode && err.statusCode < 500) {
    return {
      statusCode: err.statusCode,
      body: err.message,
      headers: textHeaders,
    };
  }
  throw err;
};

export const handleLocalError = (err: any, res: Response) => {
  console.error(`responding with an error:`, err.message);
  const statusCode = err.statusCode || 500;

  res.status(statusCode).send(err.message);
};
