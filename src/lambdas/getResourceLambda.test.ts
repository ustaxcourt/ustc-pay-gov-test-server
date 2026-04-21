import type { Request, Response } from "express";
import {
  getResourceLocal,
  handler,
  lambdaAppContext,
} from "./getResourceLambda";

const mockAuthenticateRequest = jest.fn();
jest.mock("./authenticateRequest", () => ({
  authenticateRequest: (...args: any[]) => mockAuthenticateRequest(...args),
}));

jest.mock("./handleError", () => ({
  handleLocalError: jest.fn(),
  handleLambdaError: jest.fn(() => ({ statusCode: 500, body: "error" })),
}));

describe("getResourceLocal", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let sendSpy: jest.Mock;
  let appContext: any;
  let localGetResourceUseCase: jest.Mock;

  beforeEach(() => {
    sendSpy = jest.fn();
    localGetResourceUseCase = jest.fn().mockResolvedValue("resource-content");
    appContext = {
      useCases: () => ({
        getResource: localGetResourceUseCase,
      }),
    };
    req = { params: { file: "test.txt" }, headers: {} } as any;
    (req as any).locals = { appContext };
    res = { send: sendSpy, locals: { appContext } };
    mockAuthenticateRequest.mockReset();
  });

  it("should call getResourceLocal and send result", async () => {
    await getResourceLocal(req as Request, res as Response);
    expect(mockAuthenticateRequest).toHaveBeenCalledWith(req.headers);
    expect(localGetResourceUseCase).toHaveBeenCalledWith(appContext, {
      filename: (req.params as any).file,
    });
    expect(sendSpy).toHaveBeenCalledWith("resource-content");
  });

  it("should handle errors in getResourceLocal", async () => {
    const { handleLocalError } = require("./handleError");
    const error = new Error("fail");
    mockAuthenticateRequest.mockImplementationOnce(() => {
      throw error;
    });
    await getResourceLocal(req as Request, res as Response);
    expect(handleLocalError).toHaveBeenCalledWith(error, res);
  });
});

describe("handler", () => {
  let lambdaGetResourceUseCase: jest.Mock;
  let originalUseCases: any;

  beforeEach(() => {
    mockAuthenticateRequest.mockReset();
    originalUseCases = (lambdaAppContext as any).useCases;
    lambdaGetResourceUseCase = jest.fn().mockResolvedValue("lambda-resource");
    (lambdaAppContext as any).useCases = () => ({
      getResource: lambdaGetResourceUseCase,
    });
  });

  afterEach(() => {
    (lambdaAppContext as any).useCases = originalUseCases;
  });

  it("should call handler and return 200 with body", async () => {
    const result = await handler({ headers: {}, pathParameters: { filename: "test.txt" } } as any);
    expect(mockAuthenticateRequest).toHaveBeenCalledWith({});
    expect(lambdaGetResourceUseCase).toHaveBeenCalledWith(lambdaAppContext, {
      filename: "test.txt",
    });
    expect(result).toEqual({ statusCode: 200, body: "lambda-resource" });
    const { handleLambdaError } = require("./handleError");
    expect(handleLambdaError).not.toHaveBeenCalled();
  });

  it("should handle errors in handler", async () => {
    const { handleLambdaError } = require("./handleError");
    const error = new Error("fail");
    mockAuthenticateRequest.mockImplementationOnce(() => {
      throw error;
    });
    const result = await handler({ headers: {}, pathParameters: { filename: "test.txt" } } as any);
    expect(handleLambdaError).toHaveBeenCalledWith(error);
    expect(result).toEqual({ statusCode: 500, body: "error" });
  });
});
