import { Response } from "express";
import { UnauthorizedError } from "../errors/UnauthorizedError";
import { handleLambdaError, handleLocalError } from "./handleError";

const unauthorizedError = new UnauthorizedError(
  "you are not authorized to fail"
);

const internalServerError = new Error(
  "this is a generic error without a status code"
);

describe("handleLambdaError", () => {
  it("returns an object with the statusCode if the statusCode is less than 400", () => {
    const handledError = handleLambdaError(unauthorizedError);
    expect(handledError.statusCode).toBe(403);
  });

  it("does not throw an error if the status code is less than 500", () => {
    expect(() => handleLambdaError(unauthorizedError)).not.toThrow();
  });

  it("throws an error if the statuscode is not present", () => {
    expect(() => handleLambdaError(internalServerError)).toThrow();
  });
});
