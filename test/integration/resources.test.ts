import { getBaseUrl } from "./helpers";

describe("test resources", () => {
  let baseUrl: string;
  beforeAll(() => {
    baseUrl = getBaseUrl();
  });

  it("should load all of the expected resources", async () => {
    const resourcesToCheck = [
      "wsdl/TCSOnlineService_3_2.wsdl",
      "wsdl/TCSOnlineService_3_2.xsd",
      "wsdl/tcs_common_types.xsd",
      "wsdl",
    ];

    for (const resource of resourcesToCheck) {
      const response = await fetch(`${baseUrl}/${resource}`);
      expect(response.status).toBe(200);
    }
  });
});
