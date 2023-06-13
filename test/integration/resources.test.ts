import { getConfig } from "./helpers";

describe("test resources", () => {
  let baseUrl: string;
  let apiToken: string;
  const resourcesToCheck = [
    "wsdl/TCSOnlineService_3_2.wsdl",
    "wsdl/TCSOnlineService_3_2.xsd",
    "wsdl/tcs_common_types.xsd",
    "wsdl",
  ];

  beforeAll(() => {
    const result = getConfig();
    baseUrl = result.baseUrl;
    apiToken = result.apiToken;
  });

  it("should not serve the resources without the api token", async () => {
    for (const resource of resourcesToCheck) {
      const response = await fetch(`${baseUrl}/${resource}`, {});
      expect(response.status).toBe(403);
    }
  });

  it("should load all of the expected resources", async () => {
    for (const resource of resourcesToCheck) {
      const response = await fetch(`${baseUrl}/${resource}`, {
        headers: {
          Authentication: `Bearer ${apiToken}`,
        },
      });
      expect(response.status).toBe(200);
    }
  });
});
