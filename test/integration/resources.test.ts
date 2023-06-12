import * as yaml from "js-yaml";
import { readFileSync } from "fs";
import path from "path";

type YamlConfig = {
  baseUrl: string;
};

describe("test resources", () => {
  let baseUrl: string;
  beforeAll(() => {
    const doc = yaml.load(
      readFileSync(path.resolve(__dirname, "../../config.dev.yml"), "utf-8")
    ) as YamlConfig;
    baseUrl = doc.baseUrl;
  });

  it("should load all of the expected resources", async () => {
    const resourcesToCheck = [
      "TCSOnlineService_3_2.wsdl",
      "TCSOnlineService_3_2.xsd",
      "tcs_common_types.xsd",
      "wsdl",
    ];

    for (const resource of resourcesToCheck) {
      const response = await fetch(`${baseUrl}/${resource}`);
      expect(response.status).toBe(200);
    }
  });
});
