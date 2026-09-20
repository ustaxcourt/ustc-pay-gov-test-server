import { UnauthorizedError } from "../errors/UnauthorizedError";
import { authenticateRequest } from "./authenticateRequest";

// APP_ENV decides whether authentication runs at all, and jest.config.ts loads
// the developer's .env through dotenv/config before any test runs. Set it
// explicitly per block so this suite behaves identically on a machine whose
// .env says APP_ENV=local and in CI, where no .env exists.
describe("authenticateRequest", () => {
  const originalAppEnv = process.env.APP_ENV;
  const originalToken = process.env.ACCESS_TOKEN;
  const testToken = "test-access-token";

  afterEach(() => {
    if (originalAppEnv === undefined) {
      Reflect.deleteProperty(process.env, "APP_ENV");
    } else {
      process.env.APP_ENV = originalAppEnv;
    }

    if (originalToken === undefined) {
      Reflect.deleteProperty(process.env, "ACCESS_TOKEN");
    } else {
      process.env.ACCESS_TOKEN = originalToken;
    }
  });

  describe("when the server is not running locally", () => {
    beforeEach(() => {
      process.env.APP_ENV = "dev";
      process.env.ACCESS_TOKEN = testToken;
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
          authentication: `Bearer ${testToken}`,
        }),
      ).not.toThrow();
    });

    it("should not throw an error with the correct authentication header in Title Case", () => {
      expect(() =>
        authenticateRequest({
          Authentication: `Bearer ${testToken}`,
        }),
      ).not.toThrow();
    });

    it("should not throw an error with the correct authentication header in Upper Case", () => {
      expect(() =>
        authenticateRequest({
          AUTHENTICATION: `Bearer ${testToken}`,
        }),
      ).not.toThrow();
    });


    it("rejects the literal 'Bearer undefined' when ACCESS_TOKEN is unset", () => {
      Reflect.deleteProperty(process.env, "ACCESS_TOKEN");

      expect(() =>
        authenticateRequest({
          authentication: "Bearer undefined",
        }),
      ).toThrow(UnauthorizedError);
    });

    it("rejects every request when ACCESS_TOKEN is unset", () => {
      Reflect.deleteProperty(process.env, "ACCESS_TOKEN");

      expect(() =>
        authenticateRequest({ authentication: `Bearer ${testToken}` }),
      ).toThrow(UnauthorizedError);
    });

    it("rejects every request when ACCESS_TOKEN is empty", () => {
      process.env.ACCESS_TOKEN = "";

      expect(() =>
        authenticateRequest({ authentication: "Bearer " }),
      ).toThrow(UnauthorizedError);
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
