import { Request, Response } from "express";
import { InvalidRequestError } from "../errors/InvalidRequestError";
import { handleLocalError } from "./handleError";
import { isPaymentType, isMarkablePaymentStatus } from "../types/Transaction";

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
