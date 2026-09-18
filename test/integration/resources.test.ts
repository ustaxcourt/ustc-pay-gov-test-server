import { AddressInfo } from "net";
import { Server } from "http";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { isAppEnv } from "../../src/config/appEnv";

const restoreAppEnv = (original: string | undefined) => {
  Reflect.deleteProperty(process.env, "APP_ENV");
  if (original === undefined) return;
  if (!isAppEnv(original)) {
    throw new Error(
      `Cannot restore APP_ENV to invalid value "${original}" — bad test setup leaked into beforeAll snapshot.`,
    );
  }
  process.env.APP_ENV = original;
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

  // This file runs as APP_ENV=local, where auth is skipped. Flip to "dev" to
  // exercise rejection; restore it or later tests read from S3, not disk.
  it("should not serve the resources without the api token", async () => {
    process.env.APP_ENV = "dev";

    try {
      for (const resource of resourcesToCheck) {
        const url = `${baseUrl}/${resource}`;
        const response = await fetch(url, {});
        expect(response.status).toBe(403);
      }
    } finally {
      process.env.APP_ENV = "local";
    }
  });

  it("should serve the resources without the api token when local", async () => {
    for (const resource of resourcesToCheck) {
      const url = `${baseUrl}/${resource}`;
      const response = await fetch(url, {});
      expect(response.status).toBe(200);
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
