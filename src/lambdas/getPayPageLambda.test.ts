import {
  MISSING_TOKEN_SOAP_FAULT,
  MissingTokenError,
} from "../errors/MissingTokenError";
import { getPayPageLocal, handler, lambdaAppContext } from "./getPayPageLambda";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";

describe("getPayPageLambda.handler", () => {
  const urlSuccess = "https://example.com/success";
  const urlCancel = "https://example.com/cancel";
  const renderedPayPageHtml = fs
    .readFileSync(path.join(__dirname, "../static/html/pay.html"), "utf-8")
    .replaceAll("%%urlSuccess%%", urlSuccess)
    .replaceAll("%%urlCancel%%", urlCancel);

  let originalUseCases: any;

  beforeEach(() => {
    originalUseCases = (lambdaAppContext as any).useCases;
  });

  afterEach(() => {
    (lambdaAppContext as any).useCases = originalUseCases;
    jest.restoreAllMocks();
  });

  describe("Express getPayPageLocal(req, res)", () => {
    let req: Partial<import("express").Request>;
    let res: Partial<import("express").Response>;
    let sendSpy: jest.Mock;
    let setSpy: jest.Mock;
    let statusSpy: jest.Mock;
    let showPayPage: jest.Mock;
    let appContext: {
      useCases: () => {
        showPayPage: jest.Mock;
      };
    };

    beforeEach(() => {
      sendSpy = jest.fn();
      setSpy = jest.fn().mockReturnThis();
      statusSpy = jest.fn().mockReturnThis();
      showPayPage = jest.fn().mockResolvedValue(renderedPayPageHtml);
      appContext = {
        useCases: () => ({
          showPayPage,
        }),
      };
      req = { query: {} };
      res = {
        set: setSpy,
        status: statusSpy,
        send: sendSpy,
        locals: { appContext },
      };
    });

    it("should send 'no token found' if token is missing", async () => {
      await getPayPageLocal(req as Request, res as Response);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith(MISSING_TOKEN_SOAP_FAULT);
    });

    it("should call showPayPage and send result if token is present", async () => {
      const reqWithToken = {
        query: { token: "tok" },
      } as unknown as Request;

      await getPayPageLocal(reqWithToken, res as Response);
      expect(showPayPage).toHaveBeenCalledWith(appContext, { token: "tok" });
      const renderedHtml = sendSpy.mock.calls[0][0] as string;

      expect(renderedHtml).toContain(`href="${urlSuccess}"`);
      expect(renderedHtml).toContain(`href="${urlCancel}"`);
      expect(renderedHtml).not.toContain("%%urlSuccess%%");
      expect(renderedHtml).not.toContain("%%urlCancel%%");
    });
  });

  it("should return 400 when token is missing", async () => {
    const response = await handler({} as AWSLambda.APIGatewayProxyEvent);

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe(MISSING_TOKEN_SOAP_FAULT);
    expect(response.headers).toEqual({
      "Content-Type": "application/wsdl+xml; charset=UTF-8",
    });
  });

  it("should return 200 and html when token is provided", async () => {
    const showPayPage = jest.fn().mockResolvedValue(renderedPayPageHtml);
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
    expect(response.body).toBe(renderedPayPageHtml);
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
    expect(response.body).toBe("Internal Server Error");
    expect(response.headers).toEqual({
      "Content-Type": "text/plain; charset=UTF-8",
    });
    expect(showPayPage).toHaveBeenCalledTimes(1);
  });
});
