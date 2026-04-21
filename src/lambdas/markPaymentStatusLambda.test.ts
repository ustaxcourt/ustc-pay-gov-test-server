import type { Request, Response } from "express";
import {
  handler,
  lambdaAppContext,
  markPaymentStatusLambda,
} from "./markPaymentStatusLambda";

describe("markPaymentStatusLambda", () => {
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
      await markPaymentStatusLambda(req as Request, res as Response);

      expect(handleMarkPaymentStatus).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith("No token found");
    });
  });

  describe("paymentMethod validation", () => {
    it("should return 400 when payment method is missing", async () => {
      req.query = { token: "tok" };
      delete req.params?.paymentMethod;

      await markPaymentStatusLambda(req as Request, res as Response);

      expect(handleMarkPaymentStatus).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith("Invalid payment method: undefined");
    });


    it("should return 400 when payment method or status is invalid", async () => {
      req.query = { token: "tok" };
      req.params!.paymentMethod = "INVALID_METHOD";

      await markPaymentStatusLambda(req as Request, res as Response);

      expect(handleMarkPaymentStatus).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith("Invalid payment method: INVALID_METHOD");
    });
  })

  describe("paymentStatus validation", () => {
    it("should return 400 when payment status is invalid", async () => {
      req.query = { token: "tok" };
      req.params!.paymentStatus = "INVALID_STATUS";

      await markPaymentStatusLambda(req as Request, res as Response);

      expect(handleMarkPaymentStatus).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith("Invalid payment status: INVALID_STATUS");
    });

    it("should return 400 when payment status is missing", async () => {
      req.query = { token: "tok" };
      delete req.params?.paymentStatus;

      await markPaymentStatusLambda(req as Request, res as Response);

      expect(handleMarkPaymentStatus).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith("Invalid payment status: undefined");
    });
  });

  describe("valid token and params", () => {
    it("should call handleMarkPaymentStatus and return redirectUrl", async () => {
      req.query = { token: "tok" };
      handleMarkPaymentStatus.mockResolvedValue("http://redirect.url");

      await markPaymentStatusLambda(req as Request, res as Response);

      expect(handleMarkPaymentStatus).toHaveBeenCalledWith(
        appContext,
        {
          token: "tok",
          paymentMethod: "PLASTIC_CARD",
          paymentStatus: "Failed",
        }
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ redirectUrl: "http://redirect.url" });
    });
  });

  describe("api gateway handler", () => {
    let originalUseCases: any;

    const makeEvent = (
      paymentMethod?: string,
      paymentStatus?: string,
      token?: string
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
      expect(result.body).toBe(JSON.stringify({ message: "No token found" }));
      expect(mockHandle).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid payment method", async () => {
      const result = await handler(makeEvent("NOT_VALID", "Failed", "tok"));

      expect(result.statusCode).toBe(400);
      expect(result.body).toBe(
        JSON.stringify({ message: "Invalid payment method: NOT_VALID" })
      );
    });

    it("returns 400 for invalid payment status", async () => {
      const result = await handler(
        makeEvent("PLASTIC_CARD", "NOT_VALID", "tok")
      );

      expect(result.statusCode).toBe(400);
      expect(result.body).toBe(
        JSON.stringify({ message: "Invalid payment status: NOT_VALID" })
      );
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
        JSON.stringify({ redirectUrl: "http://redirect.url" })
      );
    });

    it("returns 500 when handler use case throws", async () => {
      const mockHandle = jest.fn().mockRejectedValue(new Error("boom"));
      jest.spyOn(console, "log").mockImplementation(() => undefined);
      (lambdaAppContext as any).useCases = () => ({
        handleMarkPaymentStatus: mockHandle,
      });

      const result = await handler(makeEvent("PLASTIC_CARD", "Failed", "tok"));

      expect(result.statusCode).toBe(500);
      expect(result.body).toBe("error has occurred");
      expect(mockHandle).toHaveBeenCalledTimes(1);
    });
  });
});
