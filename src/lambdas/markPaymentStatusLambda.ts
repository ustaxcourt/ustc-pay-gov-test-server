import { Request, Response } from "express";
import { InvalidRequestError } from "../errors/InvalidRequestError";
import { handleLocalError } from "./handleError";
import { PaymentType } from "../types/Transaction";


export function isPaymentType(value: any): value is PaymentType {
  return ["PLASTIC_CARD", "ACH", "AMAZON", "PAYPAL"].includes(value);
}

export function isPaymentStatus(value: any): value is "Success" | "Failed" | "Pending" {
  return ["Success", "Failed", "Pending"].includes(value);
}

export async function markPaymentStatusLambda(req: Request, res: Response) {
  try {
    const { paymentMethod, paymentStatus } = req.params;
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      throw new InvalidRequestError("No token found");
    }

    // Validate payment method and status against allowed values
    if (!paymentMethod || !isPaymentType(paymentMethod)) {
      throw new InvalidRequestError(`Invalid payment method: ${paymentMethod}`);
    }

    if (!paymentStatus || !isPaymentStatus(paymentStatus)) {
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
