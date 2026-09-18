import { UnauthorizedError } from "../errors/UnauthorizedError";
import { authenticateRequest } from "./authenticateRequest";

// APP_ENV decides whether authentication runs at all, and jest.config.ts loads
// the developer's .env through dotenv/config before any test runs. Set it
// explicitly per block so this suite behaves identically on a machine whose
// .env says APP_ENV=local and in CI, where no .env exists.
describe("authenticateRequest", () => {
  const originalAppEnv = process.env.APP_ENV;

  afterEach(() => {
    if (originalAppEnv === undefined) {
      Reflect.deleteProperty(process.env, "APP_ENV");
      return;
    }

    process.env.APP_ENV = originalAppEnv;
  });

  describe("when the server is not running locally", () => {
    beforeEach(() => {
      process.env.APP_ENV = "dev";
    });

    it("throws an error if nothing is passed in", () => {
      expect(() => authenticateRequest()).toThrow(UnauthorizedError);
    });

    it("throws an error if with the incorrect authentication header", () => {
      expect(() =>
        authenticateRequest({
          authentication: `Bearer ${process.env.ACCESS_TOKEN} random extra stuff`,
        }),
      ).toThrow(UnauthorizedError);
    });

    it("should not throw an error with the correct authentication header", () => {
      expect(() =>
        authenticateRequest({
          authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
        }),
      ).not.toThrow();
    });

    it("should not throw an error with the correct authentication header in Title Case", () => {
      expect(() =>
        authenticateRequest({
          Authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
        }),
      ).not.toThrow();
    });

    it("should not throw an error with the correct authentication header in Upper Case", () => {
      expect(() =>
        authenticateRequest({
          AUTHENTICATION: `Bearer ${process.env.ACCESS_TOKEN}`,
        }),
      ).not.toThrow();
    });
  });

  describe("when the server is running locally", () => {
    beforeEach(() => {
      process.env.APP_ENV = "local";
    });

    it("does not require an authentication header", () => {
      expect(() => authenticateRequest()).not.toThrow();
    });

    it("does not reject an incorrect authentication header", () => {
      expect(() =>
        authenticateRequest({
          authentication: "Bearer wrong-token",
        }),
      ).not.toThrow();
    });

    it("does not require ACCESS_TOKEN to be set", () => {
      const originalToken = process.env.ACCESS_TOKEN;
      Reflect.deleteProperty(process.env, "ACCESS_TOKEN");

      try {
        expect(() => authenticateRequest({})).not.toThrow();
      } finally {
        if (originalToken !== undefined) {
          process.env.ACCESS_TOKEN = originalToken;
        }
      }
    });
  });
});
