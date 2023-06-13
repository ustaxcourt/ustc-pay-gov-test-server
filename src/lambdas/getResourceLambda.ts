import { Request, Response } from "express";
import { createAppContext } from "../appContext";

const appContext = createAppContext();

async function getResource(filename?: string) {
  return appContext.useCases().getResource(appContext, { filename });
}

export async function getResourceLambda(req: Request, res: Response) {
  const result = await getResource(req.params.file);
  res.send(result);
}

export async function handler(
  event: AWSLambda.APIGatewayProxyEvent
): Promise<AWSLambda.APIGatewayProxyResult> {
  console.log(event.pathParameters);
  try {
    const result = await getResource(event.pathParameters?.filename);
    return {
      statusCode: 200,
      body: result,
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: "Very unexpected",
    };
  }
}
