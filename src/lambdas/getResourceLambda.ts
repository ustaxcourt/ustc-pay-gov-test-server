import { Request, Response } from "express";
import { createAppContext } from "../appContext";

const appContext = createAppContext();

export function getResourceLambda(req: Request, res: Response) {
  const result = appContext
    .useCases()
    .getResource(appContext, { filename: req.params?.file });
  res.send(result);
}
