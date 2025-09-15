import { UnauthorizedError } from "../errors/UnauthorizedError";
import { authenticateRequest } from "./authenticateRequest";

describe("authenticateRequest", () => {
  it("throws an error if nothing is passed in", () => {
    expect(() => authenticateRequest()).toThrowError(UnauthorizedError);
  });

  it("throws an error if with the incorrect authentication header", () => {
    expect(() =>
      authenticateRequest({
        authentication: `Bearer ${process.env.ACCESS_TOKEN} random extra stuff`,
      })
    ).toThrowError(UnauthorizedError);
  });

  it("should not throw an error with the correct authentication header", () => {
    expect(() =>
      authenticateRequest({
        authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
      })
    ).not.toThrow();
  });

  it("should not throw an error with the correct authentication header in Title Case", () => {
    expect(() =>
      authenticateRequest({
        Authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
      })
    ).not.toThrow();
  });

  it("should not throw an error with the correct authentication header in Upper Case", () => {
    expect(() =>
      authenticateRequest({
        AUTHENTICATION: `Bearer ${process.env.ACCESS_TOKEN}`,
      })
    ).not.toThrow();
  });
});

// Testing github actions workflow. To be deleted after test