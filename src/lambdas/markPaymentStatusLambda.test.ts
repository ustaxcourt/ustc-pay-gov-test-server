import type { Request, Response } from "express";
import {
  handler,
  lambdaAppContext,
  markPaymentStatusLocal,
} from "./markPaymentStatusLambda";
import { NotFoundError } from "../errors/NotFoundError";

describe("markPaymentStatusLambda", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("markPaymentStatusLocal", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let handleMarkPaymentStatus: jest.Mock;
    let statusSpy: jest.Mock;
    let jsonSpy: jest.Mock;
    let sendSpy: jest.Mock;
    let appContext: {
      useCases: () => {
        handleMarkPaymentStatus: jest.Mock;
      };
    };

    beforeEach(() => {
      handleMarkPaymentStatus = jest.fn();
      statusSpy = jest.fn().mockReturnThis();
      jsonSpy = jest.fn();
      sendSpy = jest.fn();

      appContext = {
        useCases: () => ({
          handleMarkPaymentStatus,
        }),
      };

      req = {
        params: {
          paymentMethod: "PLASTIC_CARD",
          paymentStatus: "Failed",
        },
        query: {},
      };

      res = {
        status: statusSpy,
        json: jsonSpy,
        send: sendSpy,
        locals: {
          appContext,
        },
      };
    });

    describe("token validation", () => {
      it("should return 400 when token is missing", async () => {
        await markPaymentStatusLocal(req as Request, res as Response);

        expect(handleMarkPaymentStatus).not.toHaveBeenCalled();
        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(sendSpy).toHaveBeenCalledWith("No token found");
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });

    describe("paymentMethod validation", () => {
      it("should return 400 when payment method is missing", async () => {
        req.query = { token: "tok" };
        delete req.params?.paymentMethod;

        await markPaymentStatusLocal(req as Request, res as Response);

        expect(handleMarkPaymentStatus).not.toHaveBeenCalled();
        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(sendSpy).toHaveBeenCalledWith(
          "Invalid payment method: undefined",
        );
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it("should return 400 when payment method or status is invalid", async () => {
        req.query = { token: "tok" };
        req.params!.paymentMethod = "INVALID_METHOD";

        await markPaymentStatusLocal(req as Request, res as Response);

        expect(handleMarkPaymentStatus).not.toHaveBeenCalled();
        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(sendSpy).toHaveBeenCalledWith(
          "Invalid payment method: INVALID_METHOD",
        );
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });

    describe("paymentStatus validation", () => {
      it("should return 400 when payment status is invalid", async () => {
        req.query = { token: "tok" };
        req.params!.paymentStatus = "INVALID_STATUS";

        await markPaymentStatusLocal(req as Request, res as Response);

        expect(handleMarkPaymentStatus).not.toHaveBeenCalled();
        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(sendSpy).toHaveBeenCalledWith(
          "Invalid payment status: INVALID_STATUS",
        );
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it("should return 400 when payment status is missing", async () => {
        req.query = { token: "tok" };
        delete req.params?.paymentStatus;

        await markPaymentStatusLocal(req as Request, res as Response);

        expect(handleMarkPaymentStatus).not.toHaveBeenCalled();
        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(sendSpy).toHaveBeenCalledWith(
          "Invalid payment status: undefined",
        );
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });

    describe("valid token and params", () => {
      it("should call handleMarkPaymentStatus and return redirectUrl", async () => {
        req.query = { token: "tok" };
        handleMarkPaymentStatus.mockResolvedValue("http://redirect.url");

        await markPaymentStatusLocal(req as Request, res as Response);

        expect(handleMarkPaymentStatus).toHaveBeenCalledWith(appContext, {
          token: "tok",
          paymentMethod: "PLASTIC_CARD",
          paymentStatus: "Failed",
        });
        expect(statusSpy).toHaveBeenCalledWith(200);
        expect(jsonSpy).toHaveBeenCalledWith({
          redirectUrl: "http://redirect.url",
        });
      });

      it("should return 500 when use case throws", async () => {
        req.query = { token: "tok" };
        handleMarkPaymentStatus.mockRejectedValue(new Error("boom"));

        await markPaymentStatusLocal(req as Request, res as Response);

        expect(statusSpy).toHaveBeenCalledWith(500);
        expect(sendSpy).toHaveBeenCalledWith("boom");
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });
  });

  describe("api gateway handler", () => {
    let originalUseCases: any;

    const makeEvent = (
      paymentMethod?: string,
      paymentStatus?: string,
      token?: string,
    ) =>
      ({
        pathParameters: {
          paymentMethod,
          paymentStatus,
        },
        queryStringParameters: token ? { token } : undefined,
      } as unknown as AWSLambda.APIGatewayProxyEvent);

    beforeEach(() => {
      originalUseCases = (lambdaAppContext as any).useCases;
    });

    afterEach(() => {
      (lambdaAppContext as any).useCases = originalUseCases;
    });

    it("returns 400 when token is missing", async () => {
      const mockHandle = jest.fn();
      (lambdaAppContext as any).useCases = () => ({
        handleMarkPaymentStatus: mockHandle,
      });
      const result = await handler(makeEvent("PLASTIC_CARD", "Failed"));

      expect(result.statusCode).toBe(400);
      expect(result.headers).toEqual({
        "Content-Type": "text/plain; charset=UTF-8",
      });
      expect(result.body).toBe("No token found");
      expect(mockHandle).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid payment method", async () => {
      const result = await handler(makeEvent("NOT_VALID", "Failed", "tok"));

      expect(result.statusCode).toBe(400);
      expect(result.headers).toEqual({
        "Content-Type": "text/plain; charset=UTF-8",
      });
      expect(result.body).toBe("Invalid payment method: NOT_VALID");
    });

    it("returns 400 for invalid payment status", async () => {
      const result = await handler(
        makeEvent("PLASTIC_CARD", "NOT_VALID", "tok"),
      );

      expect(result.statusCode).toBe(400);
      expect(result.headers).toEqual({
        "Content-Type": "text/plain; charset=UTF-8",
      });
      expect(result.body).toBe("Invalid payment status: NOT_VALID");
    });

    it("returns redirectUrl when params are valid", async () => {
      const mockHandle = jest.fn().mockResolvedValue("http://redirect.url");
      (lambdaAppContext as any).useCases = () => ({
        handleMarkPaymentStatus: mockHandle,
      });
      const result = await handler(makeEvent("PLASTIC_CARD", "Failed", "tok"));

      expect(mockHandle).toHaveBeenCalledWith(expect.any(Object), {
        token: "tok",
        paymentMethod: "PLASTIC_CARD",
        paymentStatus: "Failed",
      });
      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({ "Content-Type": "application/json" });
      expect(result.body).toBe(
        JSON.stringify({ redirectUrl: "http://redirect.url" }),
      );
    });

    it("returns 500 when handler use case throws", async () => {
      const mockHandle = jest.fn().mockRejectedValue(new Error("boom"));
      (lambdaAppContext as any).useCases = () => ({
        handleMarkPaymentStatus: mockHandle,
      });

      const result = await handler(makeEvent("PLASTIC_CARD", "Failed", "tok"));

      expect(result.statusCode).toBe(500);
      expect(result.headers).toEqual({
        "Content-Type": "text/plain; charset=UTF-8",
      });
      expect(result.body).toBe("Internal Server Error");
      expect(mockHandle).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("returns statusCode from domain errors", async () => {
      const notFoundError = new NotFoundError("Could not find file");
      const mockHandle = jest.fn().mockRejectedValue(notFoundError);
      (lambdaAppContext as any).useCases = () => ({
        handleMarkPaymentStatus: mockHandle,
      });

      const result = await handler(makeEvent("PLASTIC_CARD", "Failed", "tok"));

      expect(result.statusCode).toBe(404);
      expect(result.headers).toEqual({
        "Content-Type": "text/plain; charset=UTF-8",
      });
      expect(result.body).toBe("Could not find file");
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
