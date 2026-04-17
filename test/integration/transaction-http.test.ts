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

const toMoneyString = (value: string | number) =>
  Number.parseFloat(String(value)).toFixed(2);

const xmlOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  format: true,
};

describe("initiate transaction", () => {
  const amount = "10.00";
  const tcsAppId = "ustc-test-pay-gov-app";
  const today = DateTime.now().toFormat("yyyy-MM-dd");
  let server: Server;
  let baseUrl: string;
  let wsdlUrl: string;

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
    return parser.parse(data);
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

  const markPaymentStatus = async (
    token: string,
    paymentMethod: string,
    paymentStatus: string
  ) => {
    return fetch(
      `${baseUrl}/pay/${paymentMethod}/${paymentStatus}?token=${token}`,
      { method: "POST" }
    );
  };

  const getDetails = async (paygovTrackingId: string) => {
    const response = await postSoapRequest({
      "tcs:getDetails": {
        getDetailsRequest: {
          tcs_app_id: tcsAppId,
          paygov_tracking_id: paygovTrackingId,
        },
      },
    });

    const detailsResponse =
      response["S:Envelope"]["S:Body"]["ns2:getDetailsResponse"]
        .getDetailsResponse;

    return Array.isArray(detailsResponse.transactions)
      ? detailsResponse.transactions[0].transaction
      : detailsResponse.transactions.transaction;
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

      expect(result.status).toBe(200);
      expect(body).toBe("no token found");
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
      expect(trackingResponse.payment_date).toBe(today);
      expect(Date.parse(trackingResponse.transaction_date)).not.toBeNaN();
      expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
      expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      expect(trackingResponse).not.toHaveProperty("shipping_address_return_message");
    });

    it("should process a failed transaction when token is marked failed", async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const markFailedResponse = await markPaymentStatus(token, "PLASTIC_CARD", "Failed");
      expect(markFailedResponse.status).toBe(200);

      const trackingResponse = await completeOnlineCollectionWithDetails(token);

      expect(trackingResponse.paygov_tracking_id).toBeTruthy();
      expect(trackingResponse.transaction_status).toBe("Failed");
      expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
      expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
      expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
      expect(trackingResponse.payment_date).toBe(today);
      expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
      expect(trackingResponse.number_of_installments).toBe(1);
      expect(Date.parse(trackingResponse.transaction_date)).not.toBeNaN();
      expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
      expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      expect(trackingResponse).not.toHaveProperty("shipping_address_return_message");
    });

    it("should return an error when token is already marked failed", async () => {
      const { token } = await startOnlineCollection(amount);

      const firstResponse = await markPaymentStatus(token, "PLASTIC_CARD", "Failed");
      expect(firstResponse.status).toBe(200);

      const secondResponse = await markPaymentStatus(token, "PLASTIC_CARD", "Failed");
      const errorMessage = await secondResponse.text();

      expect(secondResponse.status).toBe(400);
      expect(errorMessage).toBe("Token already marked failed");
    });
  });

  describe("ACH payment", () => {
    it(`should return Received status within ${ACH_THRESHOLD_SECONDS} seconds of ACH initiation`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const frozenNow = DateTime.now();
      const nowSpy = jest.spyOn(DateTime, "now").mockReturnValue(frozenNow);

      try {
        const markAchResponse = await markPaymentStatus(token, "ACH", "Success");
        expect(markAchResponse.status).toBe(200);

        const trackingResponse = await completeOnlineCollectionWithDetails(token);

        expect(trackingResponse.paygov_tracking_id).toBeTruthy();
        expect(trackingResponse.transaction_status).toBe("Received");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.payment_date).toBe(today);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it(`should return Success status when ACH initiation is ${ACH_THRESHOLD_SECONDS + 1} seconds ago`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const markAchResponse = await markPaymentStatus(token, "ACH", "Success");
      expect(markAchResponse.status).toBe(200);

      const nowSpy = jest
        .spyOn(DateTime, "now")
        .mockReturnValue(DateTime.now().plus({ seconds: ACH_THRESHOLD_SECONDS + 1 }));

      try {
        const trackingResponse = await completeOnlineCollectionWithDetails(token);

        expect(trackingResponse.paygov_tracking_id).toBeTruthy();
        expect(trackingResponse.transaction_status).toBe("Success");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.payment_date).toBe(today);
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
        const markAchFailedResponse = await markPaymentStatus(token, "ACH", "Failed");
        expect(markAchFailedResponse.status).toBe(200);

        const trackingResponse = await completeOnlineCollectionWithDetails(token);

        expect(trackingResponse.paygov_tracking_id).toBeTruthy();
        expect(trackingResponse.transaction_status).toBe("Received");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.payment_date).toBe(today);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it(`should return Failed status when ACH is marked failed more than ${ACH_THRESHOLD_SECONDS} seconds after initiation`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const markAchFailedResponse = await markPaymentStatus(token, "ACH", "Failed");
      expect(markAchFailedResponse.status).toBe(200);

      const nowSpy = jest
        .spyOn(DateTime, "now")
        .mockReturnValue(DateTime.now().plus({ seconds: ACH_THRESHOLD_SECONDS + 1 }));

      try {
        const trackingResponse = await completeOnlineCollectionWithDetails(token);

        expect(trackingResponse.paygov_tracking_id).toBeTruthy();
        expect(trackingResponse.transaction_status).toBe("Failed");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.payment_date).toBe(today);
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
      const completeResponse = await completeOnlineCollectionWithDetails(token);
      const trackingResponse = await getDetails(
        completeResponse.paygov_tracking_id
      );

      expect(trackingResponse.paygov_tracking_id).toBeTruthy();
      expect(trackingResponse.paygov_tracking_id).toMatch(/^[A-Za-z0-9 ]{21}$/);
      expect(trackingResponse.transaction_status).toBe("Success");
      expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
      expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
      expect(trackingResponse.transaction_status).toBe("Success");
      expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
      expect(Date.parse(trackingResponse.transaction_date)).not.toBeNaN();
      expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
      expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
      expect(trackingResponse.number_of_installments).toBe(1);
      expect(trackingResponse.payment_date).toBe(today);
      expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      expect(trackingResponse).not.toHaveProperty("shipping_address_return_message");
    });

    it("should find the details of a failed transaction", async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);
      const markFailedResponse = await markPaymentStatus(token, "PLASTIC_CARD", "Failed");
      expect(markFailedResponse.status).toBe(200);

      const completeResponse = await completeOnlineCollectionWithDetails(token);
      const trackingResponse = await getDetails(
        completeResponse.paygov_tracking_id
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
      expect(trackingResponse.payment_date).toBe(today);
      expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      expect(trackingResponse).not.toHaveProperty("shipping_address_return_message");
    });

    it(`should return Received status for ACH within ${ACH_THRESHOLD_SECONDS} seconds via getDetails`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const frozenNow = DateTime.now();
      const nowSpy = jest.spyOn(DateTime, "now").mockReturnValue(frozenNow);

      try {
        await markPaymentStatus(token, "ACH", "Success");
        const completeResponse = await completeOnlineCollectionWithDetails(token);
        const trackingResponse = await getDetails(completeResponse.paygov_tracking_id);

        expect(trackingResponse.transaction_status).toBe("Received");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.payment_date).toBe(today);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it(`should return Success status for ACH more than ${ACH_THRESHOLD_SECONDS} seconds after initiation via getDetails`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      await markPaymentStatus(token, "ACH", "Success");
      const completeResponse = await completeOnlineCollectionWithDetails(token);

      const nowSpy = jest
        .spyOn(DateTime, "now")
        .mockReturnValue(DateTime.now().plus({ seconds: ACH_THRESHOLD_SECONDS + 1 }));

      try {
        const trackingResponse = await getDetails(completeResponse.paygov_tracking_id);

        expect(trackingResponse.transaction_status).toBe("Success");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.payment_date).toBe(today);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it(`should return Received status for ACH failed within ${ACH_THRESHOLD_SECONDS} seconds via getDetails`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const frozenNow = DateTime.now();
      const nowSpy = jest.spyOn(DateTime, "now").mockReturnValue(frozenNow);

      try {
        await markPaymentStatus(token, "ACH", "Failed");
        const completeResponse = await completeOnlineCollectionWithDetails(token);
        const trackingResponse = await getDetails(completeResponse.paygov_tracking_id);

        expect(trackingResponse.transaction_status).toBe("Received");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.payment_date).toBe(today);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it(`should return Failed status for ACH failed more than ${ACH_THRESHOLD_SECONDS} seconds after initiation via getDetails`, async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      await markPaymentStatus(token, "ACH", "Failed");
      const completeResponse = await completeOnlineCollectionWithDetails(token);

      const nowSpy = jest
        .spyOn(DateTime, "now")
        .mockReturnValue(DateTime.now().plus({ seconds: ACH_THRESHOLD_SECONDS + 1 }));

      try {
        const trackingResponse = await getDetails(completeResponse.paygov_tracking_id);

        expect(trackingResponse.transaction_status).toBe("Failed");
        expect(trackingResponse.payment_type).toBe("ACH");
        expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
        expect(toMoneyString(trackingResponse.transaction_amount)).toBe(amount);
        expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
        expect(trackingResponse.number_of_installments).toBe(1);
        expect(trackingResponse.payment_date).toBe(today);
        expect(trackingResponse.transaction_date).toMatch(isoDateTimeRegex);
        expect(trackingResponse.payment_date).toMatch(yyyyMmDdRegex);
      } finally {
        nowSpy.mockRestore();
      }
    });
  });

  describe("handleMarkPaymentStatus", () => {
    describe ("ACH", () => {
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
        const response = await markPaymentStatus(token, "ACH", "INVALID_STATUS");
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

        const failedResponse = await markPaymentStatus(token, "PLASTIC_CARD", "Failed");
        const errorMessage = await failedResponse.text();

        expect(failedResponse.status).toBe(400);
        expect(errorMessage).toBe("Token already marked as ACH");
      });
    });

    describe("PLASTIC_CARD", () => {
      it("should successfully mark a transaction as successful", async () => {
        const { token } = await startOnlineCollection(amount);

        const response = await markPaymentStatus(token, "PLASTIC_CARD", "Success");
        expect(response.status).toBe(200);
      });

      it("should successfully mark a transaction as failed", async () => {
        const { token } = await startOnlineCollection(amount);

        const response = await markPaymentStatus(token, "PLASTIC_CARD", "Failed");
        expect(response.status).toBe(200);
      });

      it("should return an error for unknown payment status", async () => {
        const { token } = await startOnlineCollection(amount);

        const response = await markPaymentStatus(token, "PLASTIC_CARD", "UNKNOWN_STATUS");
        const errorMessage = await response.text();

        expect(response.status).toBe(400);
        expect(errorMessage).toBe("Invalid payment status: UNKNOWN_STATUS");
      });
    });

    it("should return an error for invalid payment method", async () => {
      const { token } = await startOnlineCollection(amount);

      const response = await markPaymentStatus(token, "INVALID_METHOD", "Success");
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
      expect(errorMessage).toBe("No token found");
    });

    it("should return redirectUrl json for a valid request", async () => {
      const { token } = await startOnlineCollection(amount);

      const response = await fetch(
        `${baseUrl}/pay/PLASTIC_CARD/Success?token=${token}`,
        { method: "POST" }
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ redirectUrl: "https://example.com/success" });
    });
  });

  describe("getPayPageLambda", () => {
    it("should return 200 and the pay page html when token is provided", async () => {
      const { token } = await startOnlineCollection(amount);

      const response = await fetch(`${baseUrl}/pay?token=${token}`);
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(body).toContain("Complete Payment");
      expect(body).toContain("Complete Payment (ACH - Success)");
      expect(body).toContain("Complete Payment (Credit Card - Failed)");
      expect(body).toContain("Complete Payment (ACH - Failed)");
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
});
