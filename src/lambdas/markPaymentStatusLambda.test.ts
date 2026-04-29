import type { Request, Response } from "express";
import { markPaymentStatusLambda } from "./markPaymentStatusLambda";

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

    it.each([
      { paymentMethod: "PLASTIC_CARD", token: "plastic_tok", redirectUrl: "https://plastic-success.example.com" },
      { paymentMethod: "ACH", token: "ach_tok", redirectUrl: "https://ach-success.example.com" },
      { paymentMethod: "PAYPAL", token: "paypal_tok", redirectUrl: "https://paypal-success.example.com" },
    ])(
      "should handle $paymentMethod Success status",
      async ({ paymentMethod, token, redirectUrl }) => {
        req.query = { token };
        req.params!.paymentMethod = paymentMethod;
        req.params!.paymentStatus = "Success";
        handleMarkPaymentStatus.mockResolvedValue(redirectUrl);

        await markPaymentStatusLambda(req as Request, res as Response);

        expect(handleMarkPaymentStatus).toHaveBeenCalledWith(appContext, {
          token,
          paymentMethod,
          paymentStatus: "Success",
        });
        expect(statusSpy).toHaveBeenCalledWith(200);
        expect(jsonSpy).toHaveBeenCalledWith({ redirectUrl });
      }
    );
  });
});
