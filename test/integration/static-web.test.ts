import { Server } from "http";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { jest, afterAll, beforeAll, describe, expect, it } from "@jest/globals";

const xmlOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  trimValues: false,
  format: true,
};

describe("static web", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = "local";
    const { app } = await import("../../src/app");
    server = await new Promise<Server>((resolve, reject) => {
      const listeningServer = app.listen(0, () => {
        resolve(listeningServer);
      });
      listeningServer.once("error", reject);
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  const startOnlineCollection = async (transactionAmount: string) => {
    const builder = new XMLBuilder(xmlOptions);
    const parser = new XMLParser(xmlOptions);
    const agencyTrackingId = uuidv4();
    const xmlBody = builder.build({
      "soapenv:Envelope": {
        "soapenv:Header": {},
        "soapenv:Body": {
          "tcs:startOnlineCollection": {
            startOnlineCollectionRequest: {
              tcs_app_id: "ustc-test-pay-gov-app",
              agency_tracking_id: agencyTrackingId,
              transaction_type: "Sale",
              transaction_amount: transactionAmount,
              language: "en",
              url_success: "https://example.com/success",
              url_cancel: "https://example.com/cancel",
            },
          },
        },
        "@xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
        "@xmlns:tcs": "http://fms.treas.gov/services/tcsonline_3_1",
      },
    });

    const result = await fetch(`${baseUrl}/wsdl`, {
      method: "POST",
      body: xmlBody,
      headers: {
        "Content-type": "application/soap+xml",
        authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
      },
    });

    const data = await result.text();
    const response = parser.parse(data);
    const tokenResponse =
      response["S:Envelope"]["S:Body"]["ns2:startOnlineCollectionResponse"]
        .startOnlineCollectionResponse;

    return { token: tokenResponse.token as string, agencyTrackingId };
  };

  describe("local", () => {
    describe("getPayPageLambda", () => {
      it("should return 200 and the pay page html when token is provided", async () => {
        const { token } = await startOnlineCollection("10.00");

        const response = await fetch(`${baseUrl}/pay?token=${token}`);
        const body = await response.text();

        expect(response.status).toBe(200);
        expect(body).toContain("Complete Payment");
        expect(body).toContain("Complete Payment (ACH - Success)");
        expect(body).toContain("Complete Payment (Credit Card - Failed)");
        expect(body).toContain("Complete Payment (ACH - Failed)");
        expect(body).toContain("Complete Payment (PayPal - Success)");
        expect(body).toContain("Complete Payment (PayPal - Failed)");
        expect(body).toContain("Cancel Payment");
        expect(body).toContain('src="/scripts/override-links.js"');
        expect(body).toContain('href="https://example.com/success"');
        expect(body).toContain('href="https://example.com/cancel"');
      });

      it("should return 200 and an error message when token is missing", async () => {
        const response = await fetch(`${baseUrl}/pay`);
        const body = await response.text();

        expect(response.status).toBe(200);
        expect(body).toBe("no token found");
      });
    });

    describe("getScriptLocal route", () => {
      it("serves script content", async () => {
        const response = await fetch(`${baseUrl}/scripts/override-links.js`);
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("application/javascript");
        const text = await response.text();
        expect(typeof text).toBe("string");
        expect(text.length).toBeGreaterThan(0);
      });

      it("returns 404 for unsafe script path", async () => {
        const response = await fetch(`${baseUrl}/scripts/test..js`);
        expect(response.status).toBe(404);
        expect(await response.text()).toBe("Could not find file");
      });

      it("returns 404 for missing script", async () => {
        const response = await fetch(`${baseUrl}/scripts/missing-script.js`);
        expect(response.status).toBe(404);
        expect(await response.text()).toBe("Could not find file");
      });

      it("returns 404 when local lambda receives empty filename", async () => {
        const { getScriptLocal } = await import("../../src/lambdas/getScriptLambda");
        const send = jest.fn();
        const set = jest.fn().mockReturnThis();
        const status = jest.fn().mockReturnValue({ set, send });
        const appContext = { useCases: () => ({ showScript: jest.fn().mockRejectedValue(new Error("File not found") as never) }) };

        await getScriptLocal(
          { params: { file: "" } } as any,
          { status, set, send, locals: { appContext } } as any
        );

        expect(status).toHaveBeenCalledWith(404);
        expect(send).toHaveBeenCalledWith("File not found");
      });
    });
  });

  describe("api gateway", () => {
    describe("getPayPageLambda.handler", () => {
      it("returns 400 when token is missing", async () => {
        const { handler: getPayPageHandler } = await import("../../src/lambdas/getPayPageLambda");
        const response = await getPayPageHandler({
          queryStringParameters: undefined,
        } as unknown as AWSLambda.APIGatewayProxyEvent);

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe("No token found");
        expect(response.headers).toEqual({
          "Content-Type": "text/plain; charset=UTF-8",
        });
      });

      it("returns 200 when token exists", async () => {
        const {
          handler: getPayPageHandler,
          lambdaAppContext: getPayPageLambdaAppContext,
        } = await import("../../src/lambdas/getPayPageLambda");
        const token = `token-${uuidv4()}`;
        (getPayPageLambdaAppContext.files as Record<string, string>)[
          `requests/${token}.json`
        ] = JSON.stringify({
          url_success: "https://example.com/success",
          url_cancel: "https://example.com/cancel",
        });

        const response = await getPayPageHandler({
          queryStringParameters: { token },
        } as unknown as AWSLambda.APIGatewayProxyEvent);

        expect(response.statusCode).toBe(200);
        expect(response.headers).toEqual({
          "Content-Type": "text/html; charset=UTF-8",
        });
        expect(response.body).toContain("Complete Payment");
      });

      it("returns 500 when token does not exist", async () => {
        const { handler: getPayPageHandler } = await import("../../src/lambdas/getPayPageLambda");
        const response = await getPayPageHandler({
          queryStringParameters: { token: "missing-token" },
        } as unknown as AWSLambda.APIGatewayProxyEvent);

        expect(response.statusCode).toBe(500);
        expect(response.body).toBe("error has occurred");
        expect(response.headers).toEqual({
          "Content-Type": "text/plain; charset=UTF-8",
        });
      });
    });

    describe("getScriptLambda.handler", () => {
      it("returns 404 when pathParameters are missing", async () => {
        const { handler: getScriptHandler } = await import("../../src/lambdas/getScriptLambda");
        const response = await getScriptHandler({
          pathParameters: null,
        } as unknown as AWSLambda.APIGatewayProxyEvent);

        expect(response.statusCode).toBe(404);
        expect(response.body).toBe("Could not find file");
        expect(response.headers).toEqual({
          "Content-Type": "text/plain; charset=UTF-8",
        });
      });

      it("returns 404 for unsafe script path", async () => {
        const { handler: getScriptHandler } = await import("../../src/lambdas/getScriptLambda");
        const response = await getScriptHandler({
          pathParameters: { file: "../../etc/passwd" },
        } as unknown as AWSLambda.APIGatewayProxyEvent);

        expect(response.statusCode).toBe(404);
        expect(response.body).toBe("Could not find file");
        expect(response.headers).toEqual({
          "Content-Type": "text/plain; charset=UTF-8",
        });
      });

      it("returns 500 when showScript throws", async () => {
        const { handler: getScriptHandler, lambdaAppContext } = await import("../../src/lambdas/getScriptLambda");
        const error = new Error("read failed");
        (error as any).statusCode = 500;
        jest.spyOn(lambdaAppContext, "useCases").mockImplementation(() => ({
          showScript: jest.fn().mockRejectedValue(error as never) as any,
        }) as any);
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

        const response = await getScriptHandler({
          pathParameters: { file: "override-links.js" },
        } as unknown as AWSLambda.APIGatewayProxyEvent);

        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(response.statusCode).toBe(500);
        expect(response.body).toBe("error has occurred");
        expect(response.headers).toEqual({
          "Content-Type": "text/plain; charset=UTF-8",
        });
      });
    });
  });
});

