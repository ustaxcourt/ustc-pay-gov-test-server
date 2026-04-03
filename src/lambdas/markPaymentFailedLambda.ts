import { Request, Response } from "express";
import { InvalidRequestError } from "../errors/InvalidRequestError";
import { handleLocalError } from "./handleError";

export async function markPaymentFailedLambda(req: Request, res: Response) {
  try {
    if (!req.query.token || typeof req.query.token !== "string") {
      throw new InvalidRequestError("No token found");
    }

    await res.locals.appContext
      .useCases()
      .handleMarkPaymentFailed(res.locals.appContext, { token: req.query.token });

    res.status(200).send("ok");
  } catch (err) {
    handleLocalError(err, res);
  }
}
