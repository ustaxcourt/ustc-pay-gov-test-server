import { Request, Response } from "express";
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
  event: AWSLambda.APIGatewayProxyEvent
): Promise<AWSLambda.APIGatewayProxyResult> {
  const appContext = createAppContext();

  const { paymentMethod, paymentStatus } = event.pathParameters || {};
  const token = event.queryStringParameters?.token;

  if (!token || typeof token !== "string") {
    return { statusCode: 400, body: "No token found" };
  }

  if (!paymentMethod || !isPaymentType(paymentMethod)) {
    return { statusCode: 400, body: `Invalid payment method: ${paymentMethod}` };
  }

  if (!paymentStatus || !isMarkablePaymentStatus(paymentStatus)) {
    return { statusCode: 400, body: `Invalid payment status: ${paymentStatus}` };
  }

  try {
    const urlSuccess = await appContext
      .useCases()
      .handleMarkPaymentStatus(appContext, { token, paymentMethod, paymentStatus });

    return {
      statusCode: 200,
      body: JSON.stringify({ redirectUrl: urlSuccess }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    console.error(err);
    if (err instanceof InvalidRequestError) {
      return { statusCode: 400, body: (err as Error).message };
    }
    return { statusCode: 500, body: "Error has occurred" };
  }
}
