import { MISSING_TCS_APPID_SOAP_FAULT } from "./getErrorTemplate";

export class MissingTcsAppIdError extends Error {
  public readonly statusCode: number = 400;
  public readonly body: string = MISSING_TCS_APPID_SOAP_FAULT;

  constructor() {
    super("Missing or invalid TCS AppID");
  }
}
