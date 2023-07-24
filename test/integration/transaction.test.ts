import * as soap from "soap";

type StartOnlineCollectionResponse = {
  startOnlineCollectionResponse: {
    token: string;
  };
};

type CompleteOnlineCollectionResponse = {
  completeOnlineCollectionResponse: {
    pay_gov_tracking_id: string;
  };
};

describe("transaction flow", () => {
  let soapClient: soap.Client;
  let token: string;
  let trackingId: string;
  let baseUrl: string;
  let apiToken;

  beforeAll(async () => {
    soapClient = await soap.createClientAsync(
      `${process.env.BASE_URL}/wsdl?wsdl`,
      {
        forceSoap12Headers: true,
        wsdl_headers: {
          Authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
      }
    );
    soapClient.addSoapHeader({
      Authentication: apiToken,
    });
  });

  it("should generate a description", () => {
    const description = soapClient.describe();

    expect(description).toMatchObject({
      TCSOnlineService_3_2: {
        TCSOnlineService_v3_2: {
          startOnlineCollection: expect.anything(),
          completeOnlineCollection: expect.anything(),
          completeOnlineCollectionWithDetails: expect.anything(),
          createForce: expect.anything(),
          createForceWithDetails: expect.anything(),
          getDetails: expect.anything(),
          closeAuthorization: expect.anything(),
          getPaymentTypes: expect.anything(),
        },
      },
    });
  });

  it("should initiate a transaction", async () => {
    const args = {
      startOnlineCollectionRequest: {
        tcs_appid: "foo",
        agency_tracking_id: "bar",
        transaction_type: "sale",
        transaction_amount: "20.00",
        language: "en_us",
        url_cancel: "http://example.com/cancel",
        url_success: "http://example.com/success",
      },
    };
    const result = (await new Promise((resolve, reject) => {
      soapClient.startOnlineCollection(
        args,
        function (err: Error, response: any) {
          if (err) {
            console.error(err);
            return reject(err);
          }
          resolve(response);
        }
      );
    })) as StartOnlineCollectionResponse;
    console.log(result);
    token = result.startOnlineCollectionResponse.token;
    console.log(token);
    expect(token).toBeTruthy();
  });

  it("should call the pay page with the token", async () => {
    const url = `${baseUrl}/pay?token=${token}`;
    const result = await fetch(url);
    expect(result.status).toBe(200);
    expect(result.body).toBeTruthy();
  });

  it("should process the transaction", async () => {
    const args = {
      completeOnlineCollectionRequest: {
        token,
      },
    };
    const result = (await new Promise((resolve, reject) => {
      soapClient.completeOnlineCollection(
        args,
        function (err: Error, response: any) {
          if (err) {
            return reject(err);
          }
          resolve(response);
        }
      );
    })) as CompleteOnlineCollectionResponse;

    trackingId = result.completeOnlineCollectionResponse.pay_gov_tracking_id;
    expect(trackingId).toBeTruthy();
  });
});
