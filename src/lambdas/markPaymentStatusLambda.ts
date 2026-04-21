import { Request, Response } from "express";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { InvalidRequestError } from "../errors/InvalidRequestError";
import { handleLocalError } from "./handleError";
import {
  isPaymentType,
  isMarkablePaymentStatus,
  MarkablePaymentStatus,
  PaymentType,
} from "../types/Transaction";
import { createAppContext } from "../appContext";
import { AppContext } from "../types/AppContext";

export const lambdaAppContext = createAppContext();

type MarkPaymentStatusRequest = {
  token: string;
  paymentMethod: PaymentType;
  paymentStatus: MarkablePaymentStatus;
};

const validateMarkPaymentStatusRequest = (
  paymentMethod: string | undefined,
  paymentStatus: string | undefined,
  token: unknown
): MarkPaymentStatusRequest => {
  if (!token || typeof token !== "string") {
    throw new InvalidRequestError("No token found");
  }

  if (!isPaymentType(paymentMethod)) {
    throw new InvalidRequestError(`Invalid payment method: ${paymentMethod}`);
  }

  if (!isMarkablePaymentStatus(paymentStatus)) {
    throw new InvalidRequestError(`Invalid payment status: ${paymentStatus}`);
  }

  return {
    token,
    paymentMethod,
    paymentStatus,
  };
};

const markPaymentStatus = async (
  appContext: AppContext,
  request: MarkPaymentStatusRequest
) => {
  return appContext.useCases().handleMarkPaymentStatus(appContext, request);
};

export async function markPaymentStatusLambda(req: Request, res: Response) {
  try {
    const request = validateMarkPaymentStatusRequest(
      req.params.paymentMethod,
      req.params.paymentStatus,
      req.query.token
    );
    const urlSuccess = await markPaymentStatus(res.locals.appContext, request);

    res.status(200).json({ redirectUrl: urlSuccess });
  } catch (err) {
    handleLocalError(err, res);
  }
}

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const jsonHeaders = { "Content-Type": "application/json" };

  try {
    const request = validateMarkPaymentStatusRequest(
      event.pathParameters?.paymentMethod,
      event.pathParameters?.paymentStatus,
      event.queryStringParameters?.token
    );
    const redirectUrl = await markPaymentStatus(lambdaAppContext, request);

    return {
      statusCode: 200,
      body: JSON.stringify({ redirectUrl }),
      headers: jsonHeaders,
    };
  } catch (err) {
    if (err instanceof InvalidRequestError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: err.message }),
        headers: jsonHeaders,
      };
    }

    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "error has occurred" }),
      headers: jsonHeaders,
    };
  }
}
