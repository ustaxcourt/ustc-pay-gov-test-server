import { v4 as uuidv4 } from "uuid";
import { handler as getPayPageHandler, getPayPageLambda } from "./getPayPageLambda";
import * as appContextModule from "../appContext";
import type { Request, Response } from "express";

describe("getPayPageLambda.handler", () => {
  afterEach(() => {
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
    const response = await getPayPageHandler({} as AWSLambda.APIGatewayProxyEvent);

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe("No token found");
  });

  it("should return 200 and html when token is provided", async () => {
    const showPayPage = jest.fn().mockResolvedValue("<html>pay page</html>");
    jest.spyOn(appContextModule, "createAppContext").mockReturnValue({
      useCases: () => ({
        showPayPage,
      }),
    } as unknown as ReturnType<typeof appContextModule.createAppContext>);

    const response = await getPayPageHandler({
      queryStringParameters: {
        token: "valid-token",
      },
    } as unknown as AWSLambda.APIGatewayProxyEvent);

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({
      "Content-Type": "text/html; charset=UTF-8",
    });
    expect(response.body).toBe("<html>pay page</html>");
    expect(showPayPage).toHaveBeenCalledWith(expect.anything(), {
      token: "valid-token",
    });
  });

  it("should return 500 when getPayPage throws", async () => {
    const showPayPage = jest.fn().mockRejectedValue(new Error("boom"));
    jest.spyOn(appContextModule, "createAppContext").mockReturnValue({
      useCases: () => ({
        showPayPage,
      }),
    } as unknown as ReturnType<typeof appContextModule.createAppContext>);
    jest.spyOn(console, "log").mockImplementation(() => undefined);

    const response = await getPayPageHandler({
      queryStringParameters: {
        token: `token-${uuidv4()}`,
      },
    } as unknown as AWSLambda.APIGatewayProxyEvent);

    expect(response.statusCode).toBe(500);
    expect(response.body).toBe("error has occurred");
    expect(showPayPage).toHaveBeenCalledTimes(1);
  });
});
