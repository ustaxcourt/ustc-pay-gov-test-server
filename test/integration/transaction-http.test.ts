import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { v4 as uuidv4 } from "uuid";
import { DateTime } from "luxon";
import { Server } from "http";
import { AddressInfo } from "net";

const xmlOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  format: true,
};

describe("initiate transaction", () => {
  let token: string;
  let agencyTrackingId: string;
  let payGovTrackingId: string;
  const amount = "10.00";
  const failedAmount = "22.50";
  const tcsAppId = "ustc-test-pay-gov-app";
  const today = DateTime.now().toFormat("yyyy-MM-dd");
  let server: Server;
  let baseUrl: string;
  let wsdlUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = "local";
    const { app } = await import("../../src/app");
    server = app.listen(0);
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

  const completeOnlineCollectionWithDetails = async (
    token: string,
    transactionStatus?: "Success" | "Failed"
  ) => {
    const completeOnlineCollectionWithDetailsRequest: {
      tcs_app_id: string;
      token: string;
      transaction_status?: "Success" | "Failed";
    } = {
      tcs_app_id: tcsAppId,
      token,
    };

    if (transactionStatus) {
      completeOnlineCollectionWithDetailsRequest.transaction_status =
        transactionStatus;
    }

    const response = await postSoapRequest({
      "tcs:completeOnlineCollectionWithDetails": {
        completeOnlineCollectionWithDetailsRequest,
      },
    });

    return response["S:Envelope"]["S:Body"][
      "ns2:completeOnlineCollectionWithDetailsResponse"
    ].completeOnlineCollectionWithDetailsResponse;
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
      expect(pageHtml).toContain("Cancel Payment");
      expect(pageHtml).toContain('href="https://example.com/success"');
      expect(pageHtml).toContain('href="https://example.com/cancel"');
    });
  });

  describe("handleCompleteOnlineCollectionWithDetails", () => {
    it("should process a successful transaction", async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(amount);

      const trackingResponse = await completeOnlineCollectionWithDetails(token);

      expect(trackingResponse.paygov_tracking_id).toBeTruthy();
      expect(trackingResponse.transaction_status).toBe("Success");
      expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
      expect(Number(String(trackingResponse.transaction_amount))).toBe(
        Number(amount)
      );
      expect(trackingResponse.transaction_status).toBe("Success");
      expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
      expect(trackingResponse.shipping_address_return_message).toBe(
        "address not available"
      );
      expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
      expect(trackingResponse.number_of_installments).toBe(1);
      expect(trackingResponse.payment_date).toBe(today);
    });

    it("should process a failed transaction when transaction_status is Failed", async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(
        failedAmount
      );

      const trackingResponse = await completeOnlineCollectionWithDetails(
        token,
        "Failed"
      );

      expect(trackingResponse.paygov_tracking_id).toBeTruthy();
      expect(trackingResponse.transaction_status).toBe("Failed");
      expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
      expect(Number(String(trackingResponse.transaction_amount))).toBe(
        Number(failedAmount)
      );
      expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
      expect(trackingResponse.shipping_address_return_message).toBe(
        "address not available"
      );
      expect(trackingResponse.payment_date).toBeFalsy();
      expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
      expect(trackingResponse.number_of_installments).toBe(1);
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
      expect(trackingResponse.transaction_status).toBe("Success");
      expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
      expect(Number(String(trackingResponse.transaction_amount))).toBe(
        Number(amount)
      );
      expect(trackingResponse.transaction_status).toBe("Success");
      expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
      expect(trackingResponse.transaction_date).toBeTruthy();
      expect(trackingResponse.shipping_address_return_message).toBe(
        "address not available"
      );
      expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
      expect(trackingResponse.number_of_installments).toBe(1);
      expect(trackingResponse.payment_date).toBe(today);
      expect(trackingResponse.payment_date).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it("should find the details of a failed transaction", async () => {
      const { token, agencyTrackingId } = await startOnlineCollection(
        failedAmount
      );
      const completeResponse = await completeOnlineCollectionWithDetails(
        token,
        "Failed"
      );
      const trackingResponse = await getDetails(
        completeResponse.paygov_tracking_id
      );

      expect(trackingResponse.paygov_tracking_id).toBeTruthy();
      expect(trackingResponse.transaction_status).toBe("Failed");
      expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
      expect(Number(String(trackingResponse.transaction_amount))).toBe(
        Number(failedAmount)
      );
      expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
      expect(trackingResponse.transaction_date).toBeTruthy();
      expect(trackingResponse.shipping_address_return_message).toBe(
        "address not available"
      );
      expect(trackingResponse.payment_frequency).toBe("ONE_TIME");
      expect(trackingResponse.number_of_installments).toBe(1);
      expect(trackingResponse.payment_date).toBeFalsy();
    });
  });
});
