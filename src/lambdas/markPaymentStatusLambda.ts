import { Request, Response } from "express";
import { InvalidRequestError } from "../errors/InvalidRequestError";
import { handleLocalError } from "./handleError";
import { ParsedQs } from "qs";

interface ValidateParamsType {
  paymentMethod: string;
  paymentStatus: string;
  token: string | ParsedQs | (string | ParsedQs)[] | undefined;
}

const validateParams = ({
  paymentMethod,
  paymentStatus,
  token,
}: ValidateParamsType) => {
  if (!paymentMethod || typeof paymentMethod !== "string") {
    throw new InvalidRequestError("No payment method found");
  }

  if (!paymentStatus || typeof paymentStatus !== "string") {
    throw new InvalidRequestError("No payment status found");
  }

  if (!token || typeof token !== "string") {
    throw new InvalidRequestError("No token found");
  }
};

export async function markPaymentStatusLambda(req: Request, res: Response) {
  try {
    const { paymentMethod, paymentStatus } = req.params;
    const token = req.query.token;

    validateParams({ paymentMethod, paymentStatus, token });

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
