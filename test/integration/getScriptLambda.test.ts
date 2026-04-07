import { Server } from "http";
import { AddressInfo } from "net";

describe("getScriptLocal", () => {
  let server: Server;
  let baseUrl: string;

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

  it("serves the override script without authentication", async () => {
    const response = await fetch(
      `${baseUrl}/scripts/override-links.js`
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/javascript"
    );
    expect(body).toContain("Complete Payment (Credit Card - Failed)");
  });

  it("returns 404 when the script file does not exist", async () => {
    const response = await fetch(`${baseUrl}/scripts/missing-script.js`);
    const body = await response.text();

    expect(response.status).toBe(404);
    expect(body).toBe("File not found");
  });
});
