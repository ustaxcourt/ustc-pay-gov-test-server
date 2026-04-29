import { MISSING_TOKEN_SOAP_FAULT } from "./getErrorTemplate";

export class MissingTokenError extends Error {
  public readonly statusCode: number = 400;
  public readonly body: string = MISSING_TOKEN_SOAP_FAULT;

  constructor() {
    super("Missing or expired token");
  }
}
