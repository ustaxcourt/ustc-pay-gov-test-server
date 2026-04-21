import {
  getPayPageLambda,
  handler,
  lambdaAppContext,
} from "./getPayPageLambda";
import type { Request, Response } from "express";

describe("getPayPageLambda.handler", () => {
  let originalUseCases: any;

  beforeEach(() => {
    originalUseCases = (lambdaAppContext as any).useCases;
  });

  afterEach(() => {
    (lambdaAppContext as any).useCases = originalUseCases;
    jest.restoreAllMocks();
  });

  describe("Express getPayPageLambda(req, res)", () => {
    let req: Partial<import("express").Request>;
    let res: Partial<import("express").Response>;
    let sendSpy: jest.Mock;
    let showPayPage: jest.Mock;
    let appContext: {
      useCases: () => {
        showPayPage: jest.Mock;
      };
    };

    beforeEach(() => {
      sendSpy = jest.fn();
      showPayPage = jest.fn().mockResolvedValue("<html>pay page</html>");
      appContext = {
        useCases: () => ({
          showPayPage,
        }),
      };
      req = { query: {} };
      res = { send: sendSpy, locals: { appContext } };
    });

    it("should send 'no token found' if token is missing", async () => {
      await getPayPageLambda(req as Request, res as Response);
      expect(sendSpy).toHaveBeenCalledWith("no token found");
    });

    it("should call showPayPage and send result if token is present", async () => {
      req.query = { token: "tok" };
      await getPayPageLambda(req as Request, res as Response);
      expect(showPayPage).toHaveBeenCalledWith(appContext, { token: "tok" });
      expect(sendSpy).toHaveBeenCalledWith("<html>pay page</html>");
    });
  });

  it("should return 400 when token is missing", async () => {
    const response = await handler({} as AWSLambda.APIGatewayProxyEvent);

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe("No token found");
    expect(response.headers).toEqual({
      "Content-Type": "text/plain; charset=UTF-8",
    });
  });

  it("should return 200 and html when token is provided", async () => {
    const showPayPage = jest.fn().mockResolvedValue("<html>pay page</html>");
    (lambdaAppContext as any).useCases = () => ({
      showPayPage,
    });
    const response = await handler({
      queryStringParameters: {
        token: "valid-token",
      },
    } as unknown as AWSLambda.APIGatewayProxyEvent);

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({
      "Content-Type": "text/html; charset=UTF-8",
    });
    expect(response.body).toBe("<html>pay page</html>");
    expect(showPayPage).toHaveBeenCalledWith(lambdaAppContext, {
      token: "valid-token",
    });
  });

  it("should return 500 when getPayPage throws", async () => {
    const showPayPage = jest.fn().mockRejectedValue(new Error("boom"));
    (lambdaAppContext as any).useCases = () => ({
      showPayPage,
    });
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await handler({
      queryStringParameters: {
        token: "token-123",
      },
    } as unknown as AWSLambda.APIGatewayProxyEvent);

    expect(response.statusCode).toBe(500);
    expect(response.body).toBe("error has occurred");
    expect(response.headers).toEqual({
      "Content-Type": "text/plain; charset=UTF-8",
    });
    expect(showPayPage).toHaveBeenCalledTimes(1);
  });
});
