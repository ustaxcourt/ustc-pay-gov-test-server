import { Response } from "express";
import { UnauthorizedError } from "../errors/UnauthorizedError";
import {
  MISSING_TOKEN_SOAP_FAULT,
  MissingTokenError,
} from "../errors/MissingTokenError";
import { handleLambdaError, handleLocalError } from "./handleError";

const unauthorizedError = new UnauthorizedError(
  "you are not authorized to fail",
);

const internalServerError = new Error(
  "this is a generic error without a status code",
);

describe("handleLambdaError", () => {
  it("returns an object with the statusCode if the statusCode is less than 500", () => {
    const handledError = handleLambdaError(unauthorizedError);
    expect(handledError.statusCode).toBe(403);
    expect(handledError.body).toBe("you are not authorized to fail");
    expect(handledError.headers).toEqual({
      "Content-Type": "text/plain; charset=UTF-8",
    });
  });

  it("does not throw an error if the status code is less than 500", () => {
    expect(() => handleLambdaError(unauthorizedError)).not.toThrow();
  });

  it("returns 500 when the statusCode is not present", () => {
    const handledError = handleLambdaError(internalServerError);

    expect(handledError.statusCode).toBe(500);
    expect(handledError.body).toBe("Internal Server Error");
  });

  it("returns statusCode 500 when the statusCode is 500 or higher", () => {
    const serverError = { statusCode: 500, message: "server failure" };
    const handledError = handleLambdaError(serverError);

    expect(handledError.statusCode).toBe(500);
    expect(handledError.body).toBe("Internal Server Error");
  });

  it("uses a safe fallback message for non-error values", () => {
    const handledError = handleLambdaError({ statusCode: 500 });

    expect(handledError.statusCode).toBe(500);
    expect(handledError.body).toBe("Internal Server Error");
  });

  it("uses structured body and headers when present", () => {
    const handledError = handleLambdaError(new MissingTokenError());

    expect(handledError.statusCode).toBe(400);
    expect(handledError.body).toBe(MISSING_TOKEN_SOAP_FAULT);
    expect(handledError.headers).toEqual({
      "Content-Type": "application/wsdl+xml; charset=UTF-8",
    });
  });
});

describe("handleLocalError", () => {
  it("uses err.statusCode when present", () => {
    const set = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnThis();
    const send = jest.fn();
    const res = { set, status, send } as unknown as Response;
    const err = { statusCode: 403, message: "forbidden" };

    handleLocalError(err, res);

    expect(set).toHaveBeenCalledWith(
      "Content-Type",
      "text/plain; charset=UTF-8",
    );
    expect(status).toHaveBeenCalledWith(403);
    expect(send).toHaveBeenCalledWith("forbidden");
  });

  it("defaults to 500 when err.statusCode is missing", () => {
    const set = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnThis();
    const send = jest.fn();
    const res = { set, status, send } as unknown as Response;
    const err = { message: "generic error" };

    handleLocalError(err, res);

    expect(set).toHaveBeenCalledWith(
      "Content-Type",
      "text/plain; charset=UTF-8",
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("generic error");
  });

  it("uses structured body and headers when present", () => {
    const set = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnThis();
    const send = jest.fn();
    const res = { set, status, send } as unknown as Response;
    const err = new MissingTokenError();

    handleLocalError(err, res);

    expect(set).toHaveBeenCalledWith({
      "Content-Type": "application/wsdl+xml; charset=UTF-8",
    });
    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith(MISSING_TOKEN_SOAP_FAULT);
  });
});
