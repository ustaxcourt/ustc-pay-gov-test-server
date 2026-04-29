import type { Request, Response } from "express";
import { getScriptLocal, handler } from "./getScriptLambda";
import { NotFoundError } from "../errors/NotFoundError";

const makeRequest = (file: string) =>
  ({
    params: { file },
    locals: { appContext: { useCases: () => ({ showScript: jest.fn() }) } },
  } as unknown as Request);

const makeResponse = () => {
  const set = jest.fn().mockReturnThis();
  const send = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnThis();
  const res = {
    set,
    send,
    status,
    locals: { appContext: { useCases: () => ({ showScript: jest.fn() }) } },
  } as unknown as Response;
  return { res, set, send, status };
};

const makeEvent = (file?: string) =>
  ({
    pathParameters: file !== undefined ? { file } : null,
  } as unknown as AWSLambda.APIGatewayProxyEvent);

afterEach(() => {
  jest.restoreAllMocks();
});

describe("getScriptLocal", () => {
  it("serves the script if found", async () => {
    const scriptContent = 'console.log("hello");';
    const { res, set, send } = makeResponse();
    res.locals.appContext.useCases = () => ({
      showScript: jest.fn().mockResolvedValue(scriptContent),
    });

    await getScriptLocal(makeRequest("test.js"), res);

    expect(set).toHaveBeenCalledWith({
      "Content-Type": "application/javascript",
    });
    expect(send).toHaveBeenCalledWith(scriptContent);
  });

  it("returns 404 if script not found", async () => {
    const { res, set, send, status } = makeResponse();
    res.locals.appContext.useCases = () => ({
      showScript: jest
        .fn()
        .mockRejectedValue(new NotFoundError("File not found")),
    });

    await getScriptLocal(makeRequest("missing.js"), res);

    expect(status).toHaveBeenCalledWith(404);
    expect(set).not.toHaveBeenCalledWith({
      "Content-Type": "text/plain; charset=UTF-8",
    });
    expect(send).toHaveBeenCalledWith("File not found");
  });

  it("returns 500 for internal errors", async () => {
    const { res, set, send, status } = makeResponse();
    const error = new Error("Internal error");
    (error as any).statusCode = 500;
    res.locals.appContext.useCases = () => ({
      showScript: jest.fn().mockRejectedValue(error),
    });
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await getScriptLocal(makeRequest("test.js"), res);

    expect(status).toHaveBeenCalledWith(500);
    expect(set).not.toHaveBeenCalledWith({
      "Content-Type": "text/plain; charset=UTF-8",
    });
    expect(send).toHaveBeenCalledWith("Internal error");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

describe("handler", () => {
  it("serves the script if found", async () => {
    const scriptContent = 'console.log("hello");';
    const { lambdaAppContext } = require("./getScriptLambda");
    jest.spyOn(lambdaAppContext, "useCases").mockImplementation(() => ({
      showScript: jest.fn().mockResolvedValue(scriptContent),
    }));

    const result = await handler(makeEvent("test.js"));

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({
      "Content-Type": "application/javascript",
    });
    expect(result.body).toBe(scriptContent);
  });

  it("returns 404 if script not found", async () => {
    const { lambdaAppContext } = require("./getScriptLambda");
    jest.spyOn(lambdaAppContext, "useCases").mockImplementation(() => ({
      showScript: jest
        .fn()
        .mockRejectedValue(new NotFoundError("File not found")),
    }));

    const result = await handler(makeEvent("missing.js"));

    expect(result).toEqual({
      statusCode: 404,
      body: "File not found",
      headers: { "Content-Type": "text/plain; charset=UTF-8" },
    });
  });

  it("returns 500 for internal errors", async () => {
    const { lambdaAppContext } = require("./getScriptLambda");
    const error = new Error("Internal error");
    jest.spyOn(lambdaAppContext, "useCases").mockImplementation(() => ({
      showScript: jest.fn().mockRejectedValue(error),
    }));
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const result = await handler(makeEvent("test.js"));

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 500,
      body: "Internal Server Error",
      headers: { "Content-Type": "text/plain; charset=UTF-8" },
    });
  });
});
