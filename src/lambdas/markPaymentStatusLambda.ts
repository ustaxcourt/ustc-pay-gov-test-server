import { Request, Response } from "express";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { InvalidRequestError } from "../errors/InvalidRequestError";
import { MissingTokenError } from "../errors/MissingTokenError";
import { handleLambdaError, handleLocalError } from "./handleError";
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

const markPaymentStatus = async (
  appContext: AppContext,
  request: MarkPaymentStatusRequest,
) => {
  return appContext.useCases().handleMarkPaymentStatus(appContext, request);
};

const validateMarkPaymentStatusRequest = (
  paymentMethod: string | undefined,
  paymentStatus: string | undefined,
  token: unknown,
): MarkPaymentStatusRequest => {
  if (!token || typeof token !== "string") {
    throw new MissingTokenError();
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

export async function markPaymentStatusLocal(req: Request, res: Response) {
  try {
    const { paymentMethod, paymentStatus } = req.params;
    const { token } = req.query;

    const validatedRequest = validateMarkPaymentStatusRequest(
      paymentMethod,
      paymentStatus,
      token,
    );

    const urlSuccess = await markPaymentStatus(
      res.locals.appContext,
      validatedRequest,
    );

    res.status(200).json({ redirectUrl: urlSuccess });
  } catch (err) {
    handleLocalError(err, res);
  }
}

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const { paymentMethod, paymentStatus } = event.pathParameters || {};
    const { token } = event.queryStringParameters || {};

    const validatedRequest = validateMarkPaymentStatusRequest(
      paymentMethod,
      paymentStatus,
      token,
    );

    const redirectUrl = await markPaymentStatus(
      lambdaAppContext,
      validatedRequest,
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ redirectUrl }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    return handleLambdaError(err);
  }
}
