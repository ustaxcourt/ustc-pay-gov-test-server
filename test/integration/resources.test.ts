import { AddressInfo } from "net";
import { Server } from "http";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import type { AppEnv } from "../../src/config/appEnv";

const restoreAppEnv = (original: string | undefined) => {
  Reflect.deleteProperty(process.env, "APP_ENV");
  if (original !== undefined) {
    process.env.APP_ENV = original as AppEnv;
  }
};

describe("test resources", () => {
  let server: Server;
  let baseUrl: string;
  let originalAppEnv: string | undefined;
  const resourcesToCheck = [
    "wsdl/TCSOnlineService_3_1.wsdl",
    "wsdl/TCSOnlineService_3_1.xsd",
    "wsdl/tcs_common_types.xsd",
    "wsdl",
  ];

  beforeAll(async () => {
    originalAppEnv = process.env.APP_ENV;
    process.env.APP_ENV = "local";
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
    restoreAppEnv(originalAppEnv);
  });

  it("should not serve the resources without the api token", async () => {
    for (const resource of resourcesToCheck) {
      const url = `${baseUrl}/${resource}`;
      const response = await fetch(url, {});
      expect(response.status).toBe(403);
    }
  });

  it("should load all of the expected resources", async () => {
    for (const resource of resourcesToCheck) {
      const url = `${baseUrl}/${resource}`;
      const response = await fetch(url, {
        headers: {
          authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
      });
      expect(response.status).toBe(200);
    }
  });
});
