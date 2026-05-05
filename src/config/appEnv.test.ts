import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { getAppEnv, isDeployed, isLocal } from "./appEnv";

describe("appEnv", () => {
  let originalAppEnv: string | undefined;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalAppEnv = process.env.APP_ENV;
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    Reflect.deleteProperty(process.env, "APP_ENV");
    Reflect.deleteProperty(process.env, "NODE_ENV");
    if (originalAppEnv !== undefined) {
      process.env.APP_ENV = originalAppEnv as "local" | "dev" | "test";
    }
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv as
        | "development"
        | "production"
        | "test";
    }
  });

  describe("getAppEnv", () => {
    it.each(["local", "dev", "test"] as const)(
      "returns %s when APP_ENV is set to it",
      (value) => {
        process.env.APP_ENV = value;
        expect(getAppEnv()).toBe(value);
      },
    );

    it("falls back to test when APP_ENV is unset and NODE_ENV is test", () => {
      Reflect.deleteProperty(process.env, "APP_ENV");
      process.env.NODE_ENV = "test";
      expect(getAppEnv()).toBe("test");
    });

    it("throws when APP_ENV is unset and NODE_ENV is not test", () => {
      Reflect.deleteProperty(process.env, "APP_ENV");
      process.env.NODE_ENV = "development";
      expect(() => getAppEnv()).toThrow("APP_ENV is not set");
    });

    it("throws when APP_ENV is not a recognized value", () => {
      process.env.APP_ENV = "prod" as never;
      expect(() => getAppEnv()).toThrow(
        'Invalid APP_ENV "prod". Expected one of: local, dev, test',
      );
    });
  });

  describe("isLocal", () => {
    it.each<[boolean, "local" | "dev" | "test"]>([
      [true, "local"],
      [false, "dev"],
      [false, "test"],
    ])("returns %s when APP_ENV=%s", (expected, value) => {
      process.env.APP_ENV = value;
      expect(isLocal()).toBe(expected);
    });
  });

  describe("isDeployed", () => {
    it.each<[boolean, "local" | "dev" | "test"]>([
      [false, "local"],
      [true, "dev"],
      [false, "test"],
    ])("returns %s when APP_ENV=%s", (expected, value) => {
      process.env.APP_ENV = value;
      expect(isDeployed()).toBe(expected);
    });
  });
});
