import type { Request, Response } from "express";
import {
  handler,
  handleSoapRequestLocal,
  lambdaAppContext,
} from "./handleSoapRequestLambda";

const mockAuthenticateRequest = jest.fn();
jest.mock("./authenticateRequest", () => ({
  authenticateRequest: (...args: any[]) => mockAuthenticateRequest(...args),
}));

jest.mock("./handleError", () => ({
  handleLocalError: jest.fn(),
  handleLambdaError: jest.fn(() => ({ statusCode: 500, body: "error" })),
}));

const soapRequestForGetDetails = `
<soapenv:Envelope>
  <soapenv:Body>
    <tcs:getDetails>
      <getDetailsRequest>
        <paygovTrackingId>tracking-123</paygovTrackingId>
      </getDetailsRequest>
    </tcs:getDetails>
  </soapenv:Body>
</soapenv:Envelope>
`;

describe("handleSoapRequestLocal", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let sendSpy: jest.Mock;
  let appContext: any;


  beforeEach(() => {
    sendSpy = jest.fn();
    appContext = {
      useCases: () => ({
        handleGetDetails: jest.fn().mockResolvedValue("soap-response"),
      }),
    };
    req = { body: soapRequestForGetDetails, headers: {} } as any;
    (req as any).locals = { appContext };
    res = { send: sendSpy, locals: { appContext } };
    mockAuthenticateRequest.mockReset();
  });

  it("should call handleSoapRequestLocal and send result", async () => {
    await handleSoapRequestLocal(req as Request, res as Response);
    expect(mockAuthenticateRequest).toHaveBeenCalledWith(req.headers);
    expect(sendSpy).toHaveBeenCalledWith("soap-response");
  });

  it("should handle errors in handleSoapRequestLocal", async () => {
    const { handleLocalError } = require("./handleError");
    const error = new Error("fail");
    mockAuthenticateRequest.mockImplementationOnce(() => {
      throw error;
    });
    await handleSoapRequestLocal(req as Request, res as Response);
    expect(handleLocalError).toHaveBeenCalledWith(error, res);
  });
});

describe("handler", () => {
  let lambdaHandleGetDetails: jest.Mock;
  let originalUseCases: any;

  beforeEach(() => {
    mockAuthenticateRequest.mockReset();
    originalUseCases = (lambdaAppContext as any).useCases;
    lambdaHandleGetDetails = jest.fn().mockResolvedValue("lambda-soap");
    (lambdaAppContext as any).useCases = () => ({
      handleGetDetails: lambdaHandleGetDetails,
    });
  });

  afterEach(() => {
    (lambdaAppContext as any).useCases = originalUseCases;
  });

  it("should call handler and return 200 with body", async () => {
    const result = await handler({ headers: {}, body: soapRequestForGetDetails } as any);
    expect(mockAuthenticateRequest).toHaveBeenCalledWith({});
    expect(lambdaHandleGetDetails).toHaveBeenCalledWith(lambdaAppContext, {
      paygovTrackingId: "tracking-123",
    });
    expect(result).toEqual({ statusCode: 200, body: "lambda-soap" });
    const { handleLambdaError } = require("./handleError");
    expect(handleLambdaError).not.toHaveBeenCalled();
  });

  it("should handle errors in handler", async () => {
    const { handleLambdaError } = require("./handleError");
    const error = new Error("fail");
    mockAuthenticateRequest.mockImplementationOnce(() => {
      throw error;
    });
    const result = await handler({ headers: {}, body: soapRequestForGetDetails } as any);
    expect(handleLambdaError).toHaveBeenCalledWith(error);
    expect(result).toEqual({ statusCode: 500, body: "error" });
  });
});
