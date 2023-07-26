import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { v4 as uuidv4 } from "uuid";
import { DateTime } from "luxon";

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
  const tcsAppId = "ustc-test-pay-gov-app";
  const today = DateTime.now().toFormat("yyyy-MM-dd");

  it("attempts to load the wsdl", async () => {
    const url = `${process.env.BASE_URL!}/wsdl`;
    // console.log({ url });
    const result = await fetch(url, {
      headers: {
        authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
      },
    });
    // console.log(result);
    expect(result.status).toBe(200);
  });

  it("calls the server to initiate a transaction", async () => {
    agencyTrackingId = uuidv4();

    const startOnlineCollectionRequest = {
      tcs_app_id: tcsAppId,
      agency_tracking_id: agencyTrackingId,
      transaction_type: "Sale",
      transaction_amount: amount,
      language: "en",
      url_success: "https://example.com/success",
      url_cancel: "https://example.com/cancel",
    };

    const reqObj = {
      "soapenv:Envelope": {
        "soapenv:Header": {},
        "soapenv:Body": {
          "tcs:startOnlineCollection": {
            startOnlineCollectionRequest,
          },
        },
        "@xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
        "@xmlns:tcs": "http://fms.treas.gov/services/tcsonline_3_1",
      },
    };

    const builder = new XMLBuilder(xmlOptions);
    const xmlBody = builder.build(reqObj);

    const url = `${process.env.BASE_URL!}/wsdl`;
    // console.log({ url });
    const result = await fetch(url, {
      method: "POST",
      body: xmlBody,
      headers: {
        "Content-type": "application/soap+xml",
        authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
      },
    });

    // console.log({ result });

    const parser = new XMLParser(xmlOptions);
    const data = await result.text();
    const response = parser.parse(data);
    const tokenResponse =
      response["S:Envelope"]["S:Body"]["ns2:startOnlineCollectionResponse"]
        .startOnlineCollectionResponse;

    token = tokenResponse.token;
    expect(token).toBeTruthy();
  });

  it("should call the pay page with the token", async () => {
    const url = `${process.env.BASE_URL}/pay?token=${token}`;
    // console.log({ url });
    const result = await fetch(url);
    // console.log({ result });

    expect(result.status).toBe(200);
    expect(result.body).toBeTruthy();
  });

  it("should process the transaction", async () => {
    const args = {
      completeOnlineCollectionWithDetailsRequest: {
        tcs_app_id: tcsAppId,
        token,
      },
    };

    const reqObj = {
      "soapenv:Envelope": {
        "soapenv:Header": {},
        "soapenv:Body": {
          "tcs:completeOnlineCollectionWithDetails": args,
        },
        "@xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
        "@xmlns:tcs": "http://fms.treas.gov/services/tcsonline_3_1",
      },
    };

    const builder = new XMLBuilder(xmlOptions);
    const xmlBody = builder.build(reqObj);

    const url = `${process.env.BASE_URL!}/wsdl`;

    const result = await fetch(url, {
      method: "POST",
      body: xmlBody,
      headers: {
        "Content-type": "application/soap+xml",
        authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
      },
    });

    const parser = new XMLParser(xmlOptions);
    const data = await result.text();
    const response = parser.parse(data);
    const trackingResponse =
      response["S:Envelope"]["S:Body"][
        "ns2:completeOnlineCollectionWithDetailsResponse"
      ].completeOnlineCollectionWithDetailsResponse;

    expect(trackingResponse.paygov_tracking_id).toBeTruthy();
    payGovTrackingId = trackingResponse.paygov_tracking_id;
    expect(trackingResponse.transaction_status).toBe("Success");
    expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
    expect(Number(String(trackingResponse.transaction_amount))).toBe(
      Number(amount)
    );
    expect(trackingResponse.transaction_status).toBe("Success");
    expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
    expect(trackingResponse.payment_date).toBe(today);
  });

  it("should find the details of the transaction via getDetails api", async () => {
    const args = {
      getDetailsRequest: {
        tcs_app_id: tcsAppId,
        paygov_tracking_id: payGovTrackingId,
      },
    };

    const reqObj = {
      "soapenv:Envelope": {
        "soapenv:Header": {},
        "soapenv:Body": {
          "tcs:getDetails": args,
        },
        "@xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
        "@xmlns:tcs": "http://fms.treas.gov/services/tcsonline_3_1",
      },
    };

    const builder = new XMLBuilder(xmlOptions);
    const xmlBody = builder.build(reqObj);
    const url = `${process.env.BASE_URL!}/wsdl`;

    console.log({ url });

    const result = await fetch(url, {
      method: "POST",
      body: xmlBody,
      headers: {
        "Content-type": "application/soap+xml",
        authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
      },
    });

    const parser = new XMLParser(xmlOptions);
    const data = await result.text();

    console.log(data);
    const response = parser.parse(data);

    const detailsResponse =
      response["S:Envelope"]["S:Body"]["ns2:getDetailsResponse"]
        .getDetailsResponse;

    console.log({ length: detailsResponse.transactions.length });
    let trackingResponse;

    if (detailsResponse.transactions.length) {
      trackingResponse = detailsResponse.transactions[0].transaction;
    } else {
      trackingResponse = detailsResponse.transactions.transaction;
    }

    expect(trackingResponse.paygov_tracking_id).toBeTruthy();
    expect(trackingResponse.transaction_status).toBe("Success");
    expect(trackingResponse.agency_tracking_id).toBe(agencyTrackingId);
    expect(Number(String(trackingResponse.transaction_amount))).toBe(
      Number(amount)
    );
    expect(trackingResponse.transaction_status).toBe("Success");
    expect(trackingResponse.payment_type).toBe("PLASTIC_CARD");
    expect(trackingResponse.payment_date).toBe(today);
    expect(trackingResponse.payment_date).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
