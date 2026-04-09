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

  it("should return 400 when token is missing", async () => {
    await markPaymentStatusLambda(req as Request, res as Response);

    expect(handleMarkPaymentStatus).not.toHaveBeenCalled();
    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(sendSpy).toHaveBeenCalledWith("No token found");
  });

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
