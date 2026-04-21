import type { Request, Response } from "express";
import {
  handler,
  handleSoapRequestLocal,
  lambdaAppContext,
  parseRequest,
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

const soapRequestForStartOnlineCollection = `
<soapenv:Envelope>
  <soapenv:Body>
    <tcs:startOnlineCollection>
      <startOnlineCollectionRequest>
        <token>token-123</token>
      </startOnlineCollectionRequest>
    </tcs:startOnlineCollection>
  </soapenv:Body>
</soapenv:Envelope>
`;

const soapRequestForCompleteOnlineCollection = `
<soapenv:Envelope>
  <soapenv:Body>
    <tcs:completeOnlineCollection>
      <completeOnlineCollectionRequest>
        <token>token-123</token>
      </completeOnlineCollectionRequest>
    </tcs:completeOnlineCollection>
  </soapenv:Body>
</soapenv:Envelope>
`;

const soapRequestForCompleteOnlineCollectionWithDetails = `
<soapenv:Envelope>
  <soapenv:Body>
    <tcs:completeOnlineCollectionWithDetails>
      <completeOnlineCollectionWithDetailsRequest>
        <token>token-123</token>
      </completeOnlineCollectionWithDetailsRequest>
    </tcs:completeOnlineCollectionWithDetails>
  </soapenv:Body>
</soapenv:Envelope>
`;

const soapRequestForUnknownAction = `
<soapenv:Envelope>
  <soapenv:Body>
    <tcs:unsupportedAction>
      <request>
        <token>token-123</token>
      </request>
    </tcs:unsupportedAction>
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
    const { handleLocalError } = require("./handleError");
    handleLocalError.mockClear();
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

  it("should route startOnlineCollection", async () => {
    const handleStartOnlineCollection = jest.fn().mockResolvedValue("start-response");
    appContext = {
      useCases: () => ({
        handleStartOnlineCollection,
      }),
    };
    req = { body: soapRequestForStartOnlineCollection, headers: {} } as any;
    res = { send: sendSpy, locals: { appContext } };

    await handleSoapRequestLocal(req as Request, res as Response);

    expect(handleStartOnlineCollection).toHaveBeenCalledWith(appContext, {
      token: "token-123",
    });
    expect(sendSpy).toHaveBeenCalledWith("start-response");
  });

  it("should route completeOnlineCollection", async () => {
    const handleCompleteOnlineCollection = jest
      .fn()
      .mockResolvedValue("complete-response");
    appContext = {
      useCases: () => ({
        handleCompleteOnlineCollection,
      }),
    };
    req = { body: soapRequestForCompleteOnlineCollection, headers: {} } as any;
    res = { send: sendSpy, locals: { appContext } };

    await handleSoapRequestLocal(req as Request, res as Response);

    expect(handleCompleteOnlineCollection).toHaveBeenCalledWith(appContext, {
      token: "token-123",
    });
    expect(sendSpy).toHaveBeenCalledWith("complete-response");
  });

  it("should route completeOnlineCollectionWithDetails", async () => {
    const handleCompleteOnlineCollectionWithDetails = jest
      .fn()
      .mockResolvedValue("complete-details-response");
    appContext = {
      useCases: () => ({
        handleCompleteOnlineCollectionWithDetails,
      }),
    };
    req = {
      body: soapRequestForCompleteOnlineCollectionWithDetails,
      headers: {},
    } as any;
    res = { send: sendSpy, locals: { appContext } };

    await handleSoapRequestLocal(req as Request, res as Response);

    expect(handleCompleteOnlineCollectionWithDetails).toHaveBeenCalledWith(
      appContext,
      {
        token: "token-123",
      }
    );
    expect(sendSpy).toHaveBeenCalledWith("complete-details-response");
  });

  it("should call handleLocalError for unsupported SOAP action", async () => {
    const { handleLocalError } = require("./handleError");
    req = { body: soapRequestForUnknownAction, headers: {} } as any;
    res = { send: sendSpy, locals: { appContext } };

    await handleSoapRequestLocal(req as Request, res as Response);

    expect(handleLocalError).toHaveBeenCalled();
    expect(handleLocalError.mock.calls[handleLocalError.mock.calls.length - 1][1]).toBe(res);
  });
});

describe("handler", () => {
  let lambdaHandleGetDetails: jest.Mock;
  let originalUseCases: any;

  beforeEach(() => {
    mockAuthenticateRequest.mockReset();
    const { handleLambdaError } = require("./handleError");
    handleLambdaError.mockClear();
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

  it("should route startOnlineCollection in handler", async () => {
    const handleStartOnlineCollection = jest
      .fn()
      .mockResolvedValue("start-lambda-response");
    (lambdaAppContext as any).useCases = () => ({
      handleStartOnlineCollection,
    });

    const result = await handler({
      headers: {},
      body: soapRequestForStartOnlineCollection,
    } as any);

    expect(handleStartOnlineCollection).toHaveBeenCalledWith(lambdaAppContext, {
      token: "token-123",
    });
    expect(result).toEqual({ statusCode: 200, body: "start-lambda-response" });
  });

  it("should route completeOnlineCollection in handler", async () => {
    const handleCompleteOnlineCollection = jest
      .fn()
      .mockResolvedValue("complete-lambda-response");
    (lambdaAppContext as any).useCases = () => ({
      handleCompleteOnlineCollection,
    });

    const result = await handler({
      headers: {},
      body: soapRequestForCompleteOnlineCollection,
    } as any);

    expect(handleCompleteOnlineCollection).toHaveBeenCalledWith(
      lambdaAppContext,
      {
        token: "token-123",
      }
    );
    expect(result).toEqual({ statusCode: 200, body: "complete-lambda-response" });
  });

  it("should route completeOnlineCollectionWithDetails in handler", async () => {
    const handleCompleteOnlineCollectionWithDetails = jest
      .fn()
      .mockResolvedValue("complete-details-lambda-response");
    (lambdaAppContext as any).useCases = () => ({
      handleCompleteOnlineCollectionWithDetails,
    });

    const result = await handler({
      headers: {},
      body: soapRequestForCompleteOnlineCollectionWithDetails,
    } as any);

    expect(handleCompleteOnlineCollectionWithDetails).toHaveBeenCalledWith(
      lambdaAppContext,
      {
        token: "token-123",
      }
    );
    expect(result).toEqual({
      statusCode: 200,
      body: "complete-details-lambda-response",
    });
  });

  it("should pass unsupported SOAP action to handleLambdaError", async () => {
    const { handleLambdaError } = require("./handleError");

    await handler({
      headers: {},
      body: soapRequestForUnknownAction,
    } as any);

    expect(handleLambdaError).toHaveBeenCalled();
  });

  it("should pass missing body errors to handleLambdaError", async () => {
    const { handleLambdaError } = require("./handleError");

    await handler({
      headers: {},
      body: null,
    } as any);

    expect(handleLambdaError).toHaveBeenCalled();
  });
});

describe("parseRequest", () => {
  it("throws InvalidRequestError when body is missing", () => {
    expect(() => parseRequest(undefined)).toThrow("Missing body");
  });

  it("does not throw when body is present", () => {
    expect(() => parseRequest("<xml />")).not.toThrow();
  });
});
