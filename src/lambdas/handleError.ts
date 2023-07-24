import { Response } from "express";

export const handleLambdaError = (
  err: any
): AWSLambda.APIGatewayProxyResult => {
  console.error(`responding with an error`, err);
  if (err.statusCode && err.statusCode < 500) {
    return {
      statusCode: err.statusCode,
      body: err.message,
    };
  }
  throw err;
};

export const handleLocalError = (err: any, res: Response) => {
  console.error(`responding with an error:`, err.message);
  const statusCode = err.statusCode || 500;

  res.status(statusCode).send(err.message);
};
