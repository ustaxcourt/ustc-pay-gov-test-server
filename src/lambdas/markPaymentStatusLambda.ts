import { Request, Response } from "express";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { InvalidRequestError } from "../errors/InvalidRequestError";
import { handleLocalError } from "./handleError";
import { isPaymentType, isMarkablePaymentStatus } from "../types/Transaction";
import { createAppContext } from "../appContext";

export async function markPaymentStatusLambda(req: Request, res: Response) {
  try {
    const { paymentMethod, paymentStatus } = req.params;
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      throw new InvalidRequestError("No token found");
    }

    if (!isPaymentType(paymentMethod)) {
      throw new InvalidRequestError(`Invalid payment method: ${paymentMethod}`);
    }

    if (!isMarkablePaymentStatus(paymentStatus)) {
      throw new InvalidRequestError(`Invalid payment status: ${paymentStatus}`);
    }

    const urlSuccess = await res.locals.appContext
      .useCases()
      .handleMarkPaymentStatus(res.locals.appContext, {
        token,
        paymentMethod,
        paymentStatus,
      });

    res.status(200).json({ redirectUrl: urlSuccess });
  } catch (err) {
    handleLocalError(err, res);
  }
}

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const appContext = createAppContext();
  const { paymentMethod, paymentStatus } = event.pathParameters || {};
  const token = event.queryStringParameters?.token;

  if (!token || typeof token !== "string") {
    return { statusCode: 400, body: JSON.stringify({ message: "No token found" }) };
  }

  if (!isPaymentType(paymentMethod)) {
    return { statusCode: 400, body: JSON.stringify({ message: `Invalid payment method: ${paymentMethod}` }) };
  }

  if (!isMarkablePaymentStatus(paymentStatus)) {
    return { statusCode: 400, body: JSON.stringify({ message: `Invalid payment status: ${paymentStatus}` }) };
  }

  try {
    const redirectUrl = await appContext
      .useCases()
      .handleMarkPaymentStatus(appContext, {
        token,
        paymentMethod,
        paymentStatus,
      });
    return {
      statusCode: 200,
      body: JSON.stringify({ redirectUrl }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    console.log(err);
    return { statusCode: 500, body: "error has occurred" };
  }
}
