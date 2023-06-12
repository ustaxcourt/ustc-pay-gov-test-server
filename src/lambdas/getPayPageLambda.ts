import { Request, Response } from "express";
import { createAppContext } from "../appContext";

const appContext = createAppContext();

export async function getPayPageLambda(req: Request, res: Response) {
  const result = appContext.useCases().showPayPage(appContext, req.query);
  res.send(result);
}
