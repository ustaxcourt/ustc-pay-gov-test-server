import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { v4 as uuidv4 } from "uuid";
import { DateTime } from "luxon";
import { Server } from "http";
import { AddressInfo } from "net";
import {
  isoDateTimeRegex,
  yyyyMmDdRegex,
} from "../../src/useCaseHelpers/dateFormats";
import { ACH_THRESHOLD_SECONDS } from "../../src/useCaseHelpers/resolveTransactionStatus";
import { jest, afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { NotFoundError } from "../../src/errors/NotFoundError";
import { paygovTrackingIdRegex } from "../../src/useCaseHelpers/generatePaygovTrackingId";
import { MISSING_TOKEN_SOAP_FAULT } from "../../src/errors/MissingTokenError";

const toMoneyString = (value: string | number) =>
  Number.parseFloat(String(value)).toFixed(2);

const xmlOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  trimValues: false,
  format: true,
};

describe("initiate transaction", () => {
  const amount = "10.00";
  const tcsAppId = "ustc-test-pay-gov-app";
  const today = DateTime.now().toFormat("yyyy-MM-dd");
  let server: Server;
  let baseUrl: string;
  let wsdlUrl: string;
  let previousBaseUrl: string | undefined;

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
    wsdlUrl = `${baseUrl}/wsdl`;
    previousBaseUrl = process.env.BASE_URL;
    process.env.BASE_URL = baseUrl;
  });

  afterAll(async () => {
    if (previousBaseUrl === undefined) {
      Reflect.deleteProperty(process.env, "BASE_URL");
    } else {
      process.env.BASE_URL = previousBaseUrl;
    }

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

  const postSoapRequest = async (body: unknown) => {
    const builder = new XMLBuilder(xmlOptions);
    const parser = new XMLParser(xmlOptions);
    const xmlBody = builder.build({
      "soapenv:Envelope": {
        "soapenv:Header": {},
        "soapenv:Body": body,
        "@xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
        "@xmlns:tcs": "http://fms.treas.gov/services/tcsonline_3_1",
      },
    });

    const result = await fetch(wsdlUrl, {
      method: "POST",
      body: xmlBody,
      headers: {
        "Content-type": "application/soap+xml",
        authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
      },
    });

    const data = await result.text();

    if (!result.ok) {
      throw new Error(`SOAP request failed with ${result.status}: ${data}`);
    }

    return parser.parse(data);
  };

  const toSoapEnvelope = (body: unknown) => {
    const builder = new XMLBuilder(xmlOptions);
    return builder.build({
      "soapenv:Envelope": {
        "soapenv:Header": {},
        "soapenv:Body": body,
        "@xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
        "@xmlns:tcs": "http://fms.treas.gov/services/tcsonline_3_1",
      },
    });
  };

  const startOnlineCollection = async (transactionAmount: string) => {
    const agencyTrackingId = uuidv4();

    const response = await postSoapRequest({
      "tcs:startOnlineCollection": {
        startOnlineCollectionRequest: {
          tcs_app_id: tcsAppId,
          agency_tracking_id: agencyTrackingId,
          transaction_type: "Sale",
          transaction_amount: transactionAmount,
          language: "en",
          url_success: "https://example.com/success",
          url_cancel: "https://example.com/cancel",
        },
      },
    });

    const tokenResponse =
      response["S:Envelope"]["S:Body"]["ns2:startOnlineCollectionResponse"]
        .startOnlineCollectionResponse;

    return {
      token: tokenResponse.token,
      agencyTrackingId,
    };
  };

  const completeOnlineCollectionWithDetails = async (token: string) => {
    const completeOnlineCollectionWithDetailsRequest = {
      tcs_app_id: tcsAppId,
      token,
    };

    const response = await postSoapRequest({
      "tcs:completeOnlineCollectionWithDetails": {
        completeOnlineCollectionWithDetailsRequest,
      },
    });

    return response["S:Envelope"]["S:Body"][
      "ns2:completeOnlineCollectionWithDetailsResponse"
    ].completeOnlineCollectionWithDetailsResponse;
  };

  const completeOnlineCollectionWithDetailsStableTrackingId = async (
    token: string,
  ) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await completeOnlineCollectionWithDetails(token);
      const trackingId = String(result.paygov_tracking_id ?? "");
      const trimmedTrackingId = trackingId.trim();

      // SOAP parsing can normalize leading/trailing whitespace in text nodes.
      // Retry until we get a non-empty, valid tracking id without edge spaces
      // for deterministic lookups.
      if (
        trimmedTrackingId.length > 0 &&
        trackingId === trimmedTrackingId &&
        paygovTrackingIdRegex.test(trimmedTrackingId)
      ) {
        return result;
      }
    }

    throw new NotFoundError(
      "Unable to generate a stable valid paygov_tracking_id without leading/trailing spaces",
    );
  };

  const markPaymentStatus = async (
    token: string,
    paymentMethod: string,
    paymentStatus: string,
  ) => {
    return fetch(
      `${baseUrl}/pay/${paymentMethod}/${paymentStatus}?token=${token}`,
      { method: "POST" },
    );
  };

  const getDetails = async (paygovTrackingId: string) => {
    const retryDelaysMs = [25, 50, 100];
    let lastRetryableError: Error | undefined;

    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
      try {
        const response = await postSoapRequest({
          "tcs:getDetails": {
            getDetailsRequest: {
              tcs_app_id: tcsAppId,
              paygov_tracking_id: paygovTrackingId,
            },
          },
        });

        const detailsResponse =
          response["S:Envelope"]?.["S:Body"]?.["ns2:getDetailsResponse"]
            ?.getDetailsResponse;

        if (!detailsResponse) {
          throw new Error(
            `Unexpected getDetails SOAP response: ${JSON.stringify(response)}`,
          );
        }

        return Array.isArray(detailsResponse.transactions)
          ? detailsResponse.transactions[0].transaction
          : detailsResponse.transactions.transaction;
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message.includes("File not found")
        ) {
          throw error;
        }

        lastRetryableError = error;

        if (attempt === retryDelaysMs.length) {
          break;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, retryDelaysMs[attempt]),
        );
      }
    }

    throw new NotFoundError(
      `getDetails retries exhausted for paygov_tracking_id=${paygovTrackingId}. Last error: ${
        lastRetryableError?.message ?? "unknown"
      }`,
    );
  };

  describe("wsdl", () => {
    it("attempts to load the wsdl", async () => {
      const result = await fetch(wsdlUrl, {
        headers: {
          authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
      });

      expect(result.status).toBe(200);
    });
  });

  describe("handleStartOnlineCollection", () => {
    it("returns an error message when pay page token is missing", async () => {
      const result = await fetch(`${baseUrl}/pay`);
      const body = await result.text();

      expect(result.status).toBe(400);
      expect(body).toBe(MISSING_TOKEN_SOAP_FAULT);
    });

    it("calls the server to initiate a transaction", async () => {
      const { token } = await startOnlineCollection(amount);
      expect(token).toBeTruthy();
    });

    it("should call the pay page with the token", async () => {
      const { token } = await startOnlineCollection(amount);
      const url = `${baseUrl}/pay?token=${token}`;
      const result = await fetch(url);
      const pageHtml = await result.text();

      expect(result.status).toBe(200);
      expect(pageHtml).toContain("Complete Payment");
      expect(pageHtml).toContain("Complete Payment (ACH - Success)");
      expect(pageHtml).toContain("Complete Payment (Credit Card - Failed)");
      expect(pageHtml).toContain("Complete Payment (ACH - Failed)");
      expect(pageHtml).toContain("Complete Payment (PayPal - Success)");
      expect(pageHtml).toContain("Complete Payment (PayPal - Failed)");
      expect(pageHtml).toContain("Cancel Payment");
      expect(pageHtml).toContain('src="/scripts/override-links.js"');
      expect(pageHtml).toContain('href="https://example.com/success"');
      expect(pageHtml).toContain('href="https://example.com/cancel"');
    });
  });

  describe("handleCompleteOnlineCollectionWithDetails", () => {
    it("should process a successful transaction", async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const trackingResponse = await completeOnlineCollectionWithDetails(token);

      expect(trackingResponse.paygov_tracking_id).toBeTruthy();
      expect(trackingResponse.paygov_tracking_id).toMatch(/^[A-Za-z0-9 ]{21}$/);
      expect(trackingResponse.transaction_status).toBe("Success");
      expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
      expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
      expect(trackingResponse.transaction_status).toBe("Success");
      expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
      expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
      expect(trackingResponse.number_of_installments).toBe(1);
      expect(Date.parse(trackingResponse.transaction_date)).not.toBeNaN();
      expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
      expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      expect(trackingResponse).not.toHaveProperty(
        "shipping_address_return_message",
      );
    });

    it("should process a successful PLASTIC_CARD transaction when token is explicitly marked success", async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const markSuccessResponse = await markPaymentStatus(
        token,
        "PLASTIC_CARD",
        "Success",
      );
      expect(markSuccessResponse.status).toBe(200);

      const trackingResponse = await completeOnlineCollectionWithDetails(token);

      expect(trackingResponse.paygov_tracking_id).toBeTruthy();
      expect(trackingResponse.paygov_tracking_id).toMatch(/^[A-Za-z0-9 ]{21}$/);
      expect(trackingResponse.transaction_status).toBe("Success");
      expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
      expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
      expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
      expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
      expect(trackingResponse.number_of_installments).toBe(1);
      expect(Date.parse(trackingResponse.transaction_date)).not.toBeNaN();
      expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
      expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      expect(trackingResponse).not.toHaveProperty(
        "shipping_address_return_message",
      );
    });

    it.each([
      {
        flow: "completeOnlineCollectionWithDetails",
        getTrackingResponse: async (token: string) =>
          completeOnlineCollectionWithDetails(token),
      },
      {
        flow: "getDetails",
        getTrackingResponse: async (token: string) => {
          const completeResponse = await completeOnlineCollectionWithDetails(
            token,
          );
          return getDetails(completeResponse.paygov_tracking_id);
        },
      },
    ])(
      "should reflect PLASTIC_CARD Success status in $flow",
      async ({ getTrackingResponse }) => {
        const { token, agencyTrackingId } = await startOnlineCollection(amount);

        const markSuccessResponse = await markPaymentStatus(
          token,
          "PLASTIC_CARD",
          "Success",
        );
        expect(markSuccessResponse.status).toBe(200);

        const trackingResponse = await getTrackingResponse(token);

        expect(trackingResponse.paygov_tracking_id).toBeTruthy();
        expect(trackingResponse.paygov_tracking_id).toMatch(
          /^[A-Za-z0-9 ]{21}$/,
        );
        expect(trackingResponse.transaction_status).toBe("Success");
        expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.payment_date).toBe(today);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      },
    );

    it("should process a failed transaction when token is marked failed", async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const markFailedResponse = await markPaymentStatus(
        token,
        "PLASTIC_CARD",
        "Failed",
      );
      expect(markFailedResponse.status).toBe(200);

      const trackingResponse = await completeOnlineCollectionWithDetails(token);

      expect(trackingResponse.paygov_tracking_id).toBeTruthy();
      expect(trackingResponse.transaction_status).toBe("Failed");
      expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
      expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
      expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
      expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
      expect(trackingResponse.number_of_installments).toBe(1);
      expect(Date.parse(trackingResponse.transaction_date)).not.toBeNaN();
      expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
      expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      expect(trackingResponse).not.toHaveProperty(
        "shipping_address_return_message",
      );
    });

    it("should return an error when token is already marked failed", async () => {
      const { token } = await startOnlineCollection(amount);

      const firstResponse = await markPaymentStatus(
        token,
        "PLASTIC_CARD",
        "Failed",
      );
      expect(firstResponse.status).toBe(200);

      const secondResponse = await markPaymentStatus(
        token,
        "PLASTIC_CARD",
        "Failed",
      );
      const errorMessage = await secondResponse.text();

      expect(secondResponse.status).toBe(400);
      expect(errorMessage).toBe("Token already marked failed");
    });
  });

  describe("ACH payment", () => {
    it(`should return Received status within ${ACH_THRESHOLD_SECONDS} seconds of ACH initiation`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const frozenNow = DateTime.fromISO("2026-01-01T00:00:00.000Z");
      if (!frozenNow.isValid) {
        throw new Error("Invalid DateTime for mocking");
      }
      const nowSpy = jest.spyOn(DateTime, "now").mockReturnValue(frozenNow);

      try {
        const markAchResponse = await markPaymentStatus(
          token,
          "ACH",
          "Success",
        );
        expect(markAchResponse.status).toBe(200);

        const trackingResponse = await completeOnlineCollectionWithDetails(
          token,
        );

        expect(trackingResponse.paygov_tracking_id).toBeTruthy();
        expect(trackingResponse.transaction_status).toBe("Received");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it(`should return Success status when ACH initiation is ${
      ACH_THRESHOLD_SECONDS + 1
    } seconds ago`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const markAchResponse = await markPaymentStatus(token, "ACH", "Success");
      expect(markAchResponse.status).toBe(200);

      const nowSpy = jest
        .spyOn(DateTime, "now")
        .mockReturnValue(
          DateTime.now().plus({ seconds: ACH_THRESHOLD_SECONDS + 1 }),
        );

      try {
        const trackingResponse = await completeOnlineCollectionWithDetails(
          token,
        );

        expect(trackingResponse.paygov_tracking_id).toBeTruthy();
        expect(trackingResponse.transaction_status).toBe("Success");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it(`should return Received status when ACH is marked failed within ${ACH_THRESHOLD_SECONDS} seconds`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const frozenNow = DateTime.now();
      const nowSpy = jest.spyOn(DateTime, "now").mockReturnValue(frozenNow);

      try {
        const markAchFailedResponse = await markPaymentStatus(
          token,
          "ACH",
          "Failed",
        );
        expect(markAchFailedResponse.status).toBe(200);

        const trackingResponse = await completeOnlineCollectionWithDetails(
          token,
        );

        expect(trackingResponse.paygov_tracking_id).toBeTruthy();
        expect(trackingResponse.transaction_status).toBe("Received");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it(`should return Failed status when ACH is marked failed more than ${ACH_THRESHOLD_SECONDS} seconds after initiation`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const markAchFailedResponse = await markPaymentStatus(
        token,
        "ACH",
        "Failed",
      );
      expect(markAchFailedResponse.status).toBe(200);

      const nowSpy = jest
        .spyOn(DateTime, "now")
        .mockReturnValue(
          DateTime.now().plus({ seconds: ACH_THRESHOLD_SECONDS + 1 }),
        );

      try {
        const trackingResponse = await completeOnlineCollectionWithDetails(
          token,
        );

        expect(trackingResponse.paygov_tracking_id).toBeTruthy();
        expect(trackingResponse.transaction_status).toBe("Failed");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      } finally {
        nowSpy.mockRestore();
      }
    });
  });

  describe("handleGetDetails", () => {
    it("should find the details of a successful transaction via getDetails api", async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);
      const completeResponse =
        await completeOnlineCollectionWithDetailsStableTrackingId(token);
      const trackingResponse = await getDetails(
        completeResponse.paygov_tracking_id,
      );

      expect(trackingResponse.paygov_tracking_id).toBeTruthy();
      expect(trackingResponse.paygov_tracking_id).toMatch(
        paygovTrackingIdRegex,
      );
      expect(trackingResponse.transaction_status).toBe("Success");
      expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
      expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
      expect(trackingResponse.transaction_status).toBe("Success");
      expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
      expect(Date.parse(trackingResponse.transaction_date)).not.toBeNaN();
      expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
      expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
      expect(trackingResponse.number_of_installments).toBe(1);
      expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      expect(trackingResponse).not.toHaveProperty(
        "shipping_address_return_message",
      );
    });

    it("should resolve PLASTIC_CARD Success to Success status in getDetails", async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const markPaymentStatusResponse = await markPaymentStatus(
        token,
        "PLASTIC_CARD",
        "Success",
      );
      const completeResponse =
        await completeOnlineCollectionWithDetailsStableTrackingId(token);
      const trackingResponse = await getDetails(
        completeResponse.paygov_tracking_id,
      );

      expect(markPaymentStatusResponse.status).toBe(200);
      expect(trackingResponse.transaction_status).toBe("Success");
      expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
      expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
      expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
      expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
      expect(trackingResponse.number_of_installments).toBe(1);
      expect(trackingResponse.payment_date).toBe(today);
      expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
      expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
    });

    it("should find the details of a failed transaction", async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);
      const markFailedResponse = await markPaymentStatus(
        token,
        "PLASTIC_CARD",
        "Failed",
      );
      expect(markFailedResponse.status).toBe(200);

      const completeResponse =
        await completeOnlineCollectionWithDetailsStableTrackingId(token);
      const trackingResponse = await getDetails(
        completeResponse.paygov_tracking_id,
      );

      expect(trackingResponse.paygov_tracking_id).toBeTruthy();
      expect(trackingResponse.transaction_status).toBe("Failed");
      expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
      expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
      expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
      expect(Date.parse(trackingResponse.transaction_date)).not.toBeNaN();
      expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
      expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
      expect(trackingResponse.number_of_installments).toBe(1);
      expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      expect(trackingResponse).not.toHaveProperty(
        "shipping_address_return_message",
      );
    });

    it(`should return Received status for ACH within ${ACH_THRESHOLD_SECONDS} seconds via getDetails`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const frozenNow = DateTime.now();
      const nowSpy = jest.spyOn(DateTime, "now").mockReturnValue(frozenNow);

      try {
        await markPaymentStatus(token, "ACH", "Success");
        const completeResponse =
          await completeOnlineCollectionWithDetailsStableTrackingId(token);
        const trackingResponse = await getDetails(
          completeResponse.paygov_tracking_id,
        );

        expect(trackingResponse.transaction_status).toBe("Received");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it(`should return Success status for ACH more than ${ACH_THRESHOLD_SECONDS} seconds after initiation via getDetails`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      await markPaymentStatus(token, "ACH", "Success");
      const completeResponse =
        await completeOnlineCollectionWithDetailsStableTrackingId(token);

      const nowSpy = jest
        .spyOn(DateTime, "now")
        .mockReturnValue(
          DateTime.now().plus({ seconds: ACH_THRESHOLD_SECONDS + 1 }),
        );

      try {
        const trackingResponse = await getDetails(
          completeResponse.paygov_tracking_id,
        );

        expect(trackingResponse.transaction_status).toBe("Success");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it(`should return Received status for ACH failed within ${ACH_THRESHOLD_SECONDS} seconds via getDetails`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const frozenNow = DateTime.fromISO("2026-01-01T00:00:00.000Z");
      const nowSpy = jest
        .spyOn(DateTime, "now")
        .mockReturnValue(frozenNow as unknown as DateTime);

      try {
        const markAchFailedResponse = await markPaymentStatus(
          token,
          "ACH",
          "Failed",
        );
        expect(markAchFailedResponse.status).toBe(200);

        const completeResponse =
          await completeOnlineCollectionWithDetailsStableTrackingId(token);
        const trackingResponse = await getDetails(
          completeResponse.paygov_tracking_id,
        );

        expect(trackingResponse.transaction_status).toBe("Received");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it(`should return Failed status for ACH failed more than ${ACH_THRESHOLD_SECONDS} seconds after initiation via getDetails`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      await markPaymentStatus(token, "ACH", "Failed");
      const completeResponse =
        await completeOnlineCollectionWithDetailsStableTrackingId(token);

      const nowSpy = jest
        .spyOn(DateTime, "now")
        .mockReturnValue(
          DateTime.now().plus({ seconds: ACH_THRESHOLD_SECONDS + 1 }),
        );

      try {
        const trackingResponse = await getDetails(
          completeResponse.paygov_tracking_id,
        );

        expect(trackingResponse.transaction_status).toBe("Failed");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      } finally {
        nowSpy.mockRestore();
      }
    });
  });

  describe("handleMarkPaymentStatus", () => {
    describe("ACH", () => {
      it("should successfully mark a transaction as ACH success", async () => {
        const { token } = await startOnlineCollection(amount);

        const response = await markPaymentStatus(token, "ACH", "Success");
        expect(response.status).toBe(200);
      });

      it("should successfully mark a transaction as ACH failed", async () => {
        const { token } = await startOnlineCollection(amount);

        const response = await markPaymentStatus(token, "ACH", "Failed");
        expect(response.status).toBe(200);
      });

      it("should return Invalid payment status error for invalid ACH status", async () => {
        const { token } = await startOnlineCollection(amount);
        const response = await markPaymentStatus(
          token,
          "ACH",
          "INVALID_STATUS",
        );
        const errorMessage = await response.text();

        expect(response.status).toBe(400);
        expect(errorMessage).toBe("Invalid payment status: INVALID_STATUS");
      });

      it("should return an error when ACH is marked a second time", async () => {
        const { token } = await startOnlineCollection(amount);

        const firstResponse = await markPaymentStatus(token, "ACH", "Success");
        expect(firstResponse.status).toBe(200);

        const secondResponse = await markPaymentStatus(token, "ACH", "Success");
        const errorMessage = await secondResponse.text();

        expect(secondResponse.status).toBe(400);
        expect(errorMessage).toBe("Token already marked as ACH");
      });

      it("should return an error when marking failed after ACH was initiated", async () => {
        const { token } = await startOnlineCollection(amount);

        const achResponse = await markPaymentStatus(token, "ACH", "Success");
        expect(achResponse.status).toBe(200);

        const failedResponse = await markPaymentStatus(
          token,
          "PLASTIC_CARD",
          "Failed",
        );
        const errorMessage = await failedResponse.text();

        expect(failedResponse.status).toBe(400);
        expect(errorMessage).toBe("Token already marked as ACH");
      });
    });

    describe("PAYPAL", () => {
      it("should successfully mark a transaction as PAYPAL success", async () => {
        const { token } = await startOnlineCollection(amount);

        const response = await markPaymentStatus(token, "PAYPAL", "Success");
        expect(response.status).toBe(200);
      });

      it("should return an error when PAYPAL is marked a second time", async () => {
        const { token } = await startOnlineCollection(amount);

        const firstResponse = await markPaymentStatus(
          token,
          "PAYPAL",
          "Success",
        );
        expect(firstResponse.status).toBe(200);

        const secondResponse = await markPaymentStatus(
          token,
          "PAYPAL",
          "Success",
        );
        const errorMessage = await secondResponse.text();

        expect(secondResponse.status).toBe(400);
        expect(errorMessage).toBe("Token already marked as PAYPAL");
      });

      it("should successfully mark a transaction as PAYPAL failed", async () => {
        const { token } = await startOnlineCollection(amount);

        const response = await markPaymentStatus(token, "PAYPAL", "Failed");
        expect(response.status).toBe(200);
      });

      it("should return an error when marking failed after PAYPAL was selected", async () => {
        const { token } = await startOnlineCollection(amount);

        const paypalResponse = await markPaymentStatus(
          token,
          "PAYPAL",
          "Success",
        );
        expect(paypalResponse.status).toBe(200);

        const failedResponse = await markPaymentStatus(
          token,
          "PLASTIC_CARD",
          "Failed",
        );
        const errorMessage = await failedResponse.text();

        expect(failedResponse.status).toBe(400);
        expect(errorMessage).toBe("Token already marked as PAYPAL");
      });
    });

    describe("PLASTIC_CARD", () => {
      it("should successfully mark a transaction as successful", async () => {
        const { token } = await startOnlineCollection(amount);

        const response = await markPaymentStatus(
          token,
          "PLASTIC_CARD",
          "Success",
        );
        expect(response.status).toBe(200);
      });

      it("should successfully mark a transaction as failed", async () => {
        const { token } = await startOnlineCollection(amount);

        const response = await markPaymentStatus(
          token,
          "PLASTIC_CARD",
          "Failed",
        );
        expect(response.status).toBe(200);
      });

      it("should return an error for unknown payment status", async () => {
        const { token } = await startOnlineCollection(amount);

        const response = await markPaymentStatus(
          token,
          "PLASTIC_CARD",
          "UNKNOWN_STATUS",
        );
        const errorMessage = await response.text();

        expect(response.status).toBe(400);
        expect(errorMessage).toBe("Invalid payment status: UNKNOWN_STATUS");
      });
    });

    it("should return an error for invalid payment method", async () => {
      const { token } = await startOnlineCollection(amount);

      const response = await markPaymentStatus(
        token,
        "INVALID_METHOD",
        "Success",
      );
      const errorMessage = await response.text();

      expect(response.status).toBe(400);
      expect(errorMessage).toBe("Invalid payment method: INVALID_METHOD");
    });
  });

  describe("markPaymentStatusLambda", () => {
    it("should return 400 when token is missing", async () => {
      const response = await fetch(`${baseUrl}/pay/PLASTIC_CARD/Success`, {
        method: "POST",
      });
      const errorMessage = await response.text();

      expect(response.status).toBe(400);
      expect(errorMessage).toBe(MISSING_TOKEN_SOAP_FAULT);
    });

    it("should return redirectUrl json for a valid request", async () => {
      const { token } = await startOnlineCollection(amount);

      const response = await fetch(
        `${baseUrl}/pay/PLASTIC_CARD/Success?token=${token}`,
        { method: "POST" },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ redirectUrl: "https://example.com/success" });
    });
  });

  describe("getResourceLocal route", () => {
    it("returns 403 when authentication header is present but invalid", async () => {
      const response = await fetch(
        `${baseUrl}/wsdl/TCSOnlineService_3_1.wsdl`,
        {
          headers: {
            authentication: "Bearer wrong-token",
          },
        },
      );

      expect(response.status).toBe(403);
      expect(await response.text()).toBe("Missing Authentication");
    });

    it("returns 404 when filename is unsupported", async () => {
      const response = await fetch(`${baseUrl}/wsdl/unsupported.wsdl`, {
        headers: {
          authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
      });

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not found");
    });
  });

  describe("handleSoapRequestLocal route", () => {
    it("returns 400 for unsupported SOAP action", async () => {
      const response = await fetch(`${baseUrl}/wsdl`, {
        method: "POST",
        body: toSoapEnvelope({
          "tcs:unsupportedAction": {
            payload: { hello: "world" },
          },
        }),
        headers: {
          "Content-type": "application/soap+xml",
          authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
      });

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Could not find correct API");
    });
  });

  describe("api gateway getResourceLambda.handler", () => {
    it("returns 403 when headers are missing", async () => {
      const { handler: getResourceHandler } = await import(
        "../../src/lambdas/getResourceLambda"
      );
      const response = await getResourceHandler({
        headers: undefined,
        pathParameters: { filename: "TCSOnlineService_3_1.wsdl" },
      } as unknown as AWSLambda.APIGatewayProxyEvent);

      expect(response.statusCode).toBe(403);
      expect(response.body).toBe("Missing Authentication");
      expect(response.headers).toEqual({
        "Content-Type": "text/plain; charset=UTF-8",
      });
    });

    it("returns 200 for existing resource", async () => {
      const { handler: getResourceHandler } = await import(
        "../../src/lambdas/getResourceLambda"
      );
      const response = await getResourceHandler({
        headers: {
          authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
        pathParameters: { filename: "TCSOnlineService_3_1.wsdl" },
      } as unknown as AWSLambda.APIGatewayProxyEvent);

      expect(response.statusCode).toBe(200);
      expect(typeof response.body).toBe("string");
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body).toMatch(
        /<\?xml|<definitions\b|<wsdl:definitions\b/i,
      );
      expect(response.headers).toEqual(
        expect.objectContaining({
          "Content-Type": expect.stringMatching(/xml|wsdl|text\/plain/i),
        }),
      );
    });

    it("returns 404 for missing resource", async () => {
      const { handler: getResourceHandler } = await import(
        "../../src/lambdas/getResourceLambda"
      );
      const response = await getResourceHandler({
        headers: {
          authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
        pathParameters: { filename: "does-not-exist.wsdl" },
      } as unknown as AWSLambda.APIGatewayProxyEvent);

      expect(response.statusCode).toBe(404);
      expect(response.body).toBe("Not found");
      expect(response.headers).toEqual({
        "Content-Type": "text/plain; charset=UTF-8",
      });
    });
  });

  describe("api gateway handleSoapRequestLambda.handler", () => {
    it("returns 403 when headers are missing", async () => {
      const { handler: handleSoapRequestHandler } = await import(
        "../../src/lambdas/handleSoapRequestLambda"
      );
      const response = await handleSoapRequestHandler({
        headers: undefined,
        body: toSoapEnvelope({
          "tcs:getDetails": {
            getDetailsRequest: {
              tcs_app_id: tcsAppId,
              paygov_tracking_id: "abc",
            },
          },
        }),
      } as unknown as AWSLambda.APIGatewayProxyEvent);

      expect(response.statusCode).toBe(403);
      expect(response.body).toBe("Missing Authentication");
      expect(response.headers).toEqual({
        "Content-Type": "text/plain; charset=UTF-8",
      });
    });

    it("returns 400 when body is missing", async () => {
      const { handler: handleSoapRequestHandler } = await import(
        "../../src/lambdas/handleSoapRequestLambda"
      );
      const response = await handleSoapRequestHandler({
        headers: {
          authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
        body: null,
      } as unknown as AWSLambda.APIGatewayProxyEvent);

      expect(response.statusCode).toBe(400);
      expect(response.body).toBe("Missing body");
      expect(response.headers).toEqual({
        "Content-Type": "text/plain; charset=UTF-8",
      });
    });

    it("returns 400 for unsupported SOAP action", async () => {
      const { handler: handleSoapRequestHandler } = await import(
        "../../src/lambdas/handleSoapRequestLambda"
      );
      const response = await handleSoapRequestHandler({
        headers: {
          authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
        body: toSoapEnvelope({
          "tcs:unsupportedAction": {
            payload: { test: "value" },
          },
        }),
      } as unknown as AWSLambda.APIGatewayProxyEvent);

      expect(response.statusCode).toBe(400);
      expect(response.body).toBe("Could not find correct API");
      expect(response.headers).toEqual({
        "Content-Type": "text/plain; charset=UTF-8",
      });
    });

    it("returns 200 for completeOnlineCollection action", async () => {
      const { handler: handleSoapRequestHandler } = await import(
        "../../src/lambdas/handleSoapRequestLambda"
      );

      const startResponse = await handleSoapRequestHandler({
        headers: {
          authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
        body: toSoapEnvelope({
          "tcs:startOnlineCollection": {
            startOnlineCollectionRequest: {
              tcs_app_id: tcsAppId,
              agency_tracking_id: uuidv4(),
              transaction_type: "Sale",
              transaction_amount: amount,
              language: "en",
              url_success: "https://example.com/success",
              url_cancel: "https://example.com/cancel",
            },
          },
        }),
      } as unknown as AWSLambda.APIGatewayProxyEvent);

      const startTokenMatch = startResponse.body.match(
        /<token>([^<]+)<\/token>/,
      );
      expect(startResponse.statusCode).toBe(200);
      expect(startResponse.headers).toEqual({
        "Content-Type": "application/xml; charset=UTF-8",
      });
      expect(startTokenMatch).toBeTruthy();
      const token = startTokenMatch![1];

      const response = await handleSoapRequestHandler({
        headers: {
          authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
        body: toSoapEnvelope({
          "tcs:completeOnlineCollection": {
            completeOnlineCollectionRequest: {
              token,
            },
          },
        }),
      } as unknown as AWSLambda.APIGatewayProxyEvent);

      expect(response.statusCode).toBe(200);
      expect(response.headers).toEqual({
        "Content-Type": "application/xml; charset=UTF-8",
      });
      expect(response.body).toContain("paygov_tracking_id");
    });
  });

  describe("api gateway markPaymentStatusLambda.handler", () => {
    it("returns 400 for invalid payment method", async () => {
      const { handler: markPaymentStatusHandler } = await import(
        "../../src/lambdas/markPaymentStatusLambda"
      );
      const response = await markPaymentStatusHandler({
        pathParameters: {
          paymentMethod: "INVALID_METHOD",
          paymentStatus: "Success",
        },
        queryStringParameters: {
          token: "token-123",
        },
      } as unknown as AWSLambda.APIGatewayProxyEvent);

      expect(response.statusCode).toBe(400);
      expect(response.headers).toEqual({
        "Content-Type": "text/plain; charset=UTF-8",
      });
      expect(response.body).toBe("Invalid payment method: INVALID_METHOD");
    });

    it("returns 200 for valid request", async () => {
      const token = `token-${uuidv4()}`;
      const {
        handler: markPaymentStatusHandler,
        lambdaAppContext: markPaymentStatusLambdaAppContext,
      } = await import("../../src/lambdas/markPaymentStatusLambda");
      (markPaymentStatusLambdaAppContext.files as Record<string, string>)[
        `requests/${token}.json`
      ] = JSON.stringify({
        token,
        url_success: "https://example.com/success",
        url_cancel: "https://example.com/cancel",
      });

      const response = await markPaymentStatusHandler({
        pathParameters: {
          paymentMethod: "PLASTIC_CARD",
          paymentStatus: "Success",
        },
        queryStringParameters: {
          token,
        },
      } as unknown as AWSLambda.APIGatewayProxyEvent);

      expect(response.statusCode).toBe(200);
      expect(response.headers).toEqual({ "Content-Type": "application/json" });
      expect(JSON.parse(response.body)).toEqual({
        redirectUrl: "https://example.com/success",
      });
    });

    it("returns 404 for unknown token", async () => {
      const { handler: markPaymentStatusHandler } = await import(
        "../../src/lambdas/markPaymentStatusLambda"
      );
      const response = await markPaymentStatusHandler({
        pathParameters: {
          paymentMethod: "PLASTIC_CARD",
          paymentStatus: "Success",
        },
        queryStringParameters: {
          token: "missing-token",
        },
      } as unknown as AWSLambda.APIGatewayProxyEvent);

      expect(response.statusCode).toBe(404);
      expect(response.headers).toEqual({
        "Content-Type": "text/plain; charset=UTF-8",
      });
      expect(response.body).toBe("File not found");
    });
  });
});
