describe("test resources", () => {
  const baseUrl = process.env.BASE_URL;
  const resourcesToCheck = [
    "wsdl/TCSOnlineService_3_1.wsdl",
    "wsdl/TCSOnlineService_3_1.xsd",
    "wsdl/tcs_common_types.xsd",
    "wsdl",
  ];

  it("should not serve the resources without the api token", async () => {
    for (const resource of resourcesToCheck) {
      const url = `${baseUrl}/${resource}`;
      console.log(url);
      const response = await fetch(url, {});
      expect(response.status).toBe(403);
    }
  });

  it.only("should load all of the expected resources", async () => {
    for (const resource of resourcesToCheck) {
      const url = `${baseUrl}/${resource}`;
      console.log(url);
      const response = await fetch(url, {
        headers: {
          Authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
      });
      expect(response.status).toBe(200);
    }
  });
});
