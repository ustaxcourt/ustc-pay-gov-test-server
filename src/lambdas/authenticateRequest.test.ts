import { UnauthorizedError } from "../errors/UnauthorizedError";
import { authenticateRequest } from "./authenticateRequest";

describe("authenticateRequest", () => {
  it("throws an error if nothing is passed in", () => {
    expect(() => authenticateRequest()).toThrowError(UnauthorizedError);
  });

  it("should not throw an error if an authentication header is passed in ", () => {
    expect(() =>
      authenticateRequest({
        authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
      })
    ).not.toThrow();
  });

  it("should not throw an error if an authentication header is passed in Title Case", () => {
    expect(() =>
      authenticateRequest({
        Authentication: `Bearer ${process.env.ACCESS_TOKEN}`,
      })
    ).not.toThrow();
  });

  it("should not throw an error if an authentication header is passed in Upper Case", () => {
    expect(() =>
      authenticateRequest({
        AUTHENTICATION: `Bearer ${process.env.ACCESS_TOKEN}`,
      })
    ).not.toThrow();
  });
});
