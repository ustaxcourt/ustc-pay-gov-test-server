import type { Request, Response } from "express";
import { getScriptLocal, handler } from "./getScriptLambda";
import fs from "fs";
import path from "path";

const makeRequest = (file: string) =>
  ({ params: { file } } as unknown as Request);

const makeResponse = () => {
  const setHeader = jest.fn();
  const send = jest.fn();
  const status = jest.fn().mockReturnThis();
  const res = { setHeader, send, status } as unknown as Response;
  return { res, setHeader, send, status };
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
    const scriptPath = path.resolve(
      __dirname,
      "../../src/static/html/scripts/test.js"
    );
    jest.spyOn(fs, "existsSync").mockImplementation((p) => p === scriptPath);
    jest.spyOn(fs, "readFileSync").mockReturnValue(scriptContent as any);

    const { res, setHeader, send } = makeResponse();
    await getScriptLocal(makeRequest("test.js"), res);

    expect(setHeader).toHaveBeenCalledWith("Content-Type", "application/javascript");
    expect(send).toHaveBeenCalledWith(scriptContent);
  });

  it("returns 404 if script not found", async () => {
    jest.spyOn(fs, "existsSync").mockReturnValue(false);

    const { res, status, send } = makeResponse();
    await getScriptLocal(makeRequest("missing.js"), res);

    expect(status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalledWith("File not found");
  });

  it("returns 404 for an empty filename", async () => {
    const existsSpy = jest.spyOn(fs, "existsSync");

    const { res, status, send } = makeResponse();
    await getScriptLocal(makeRequest(""), res);

    expect(existsSpy).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalledWith("File not found");
  });

  it("returns 404 for path traversal filenames", async () => {
    const existsSpy = jest.spyOn(fs, "existsSync");

    const { res, status, send } = makeResponse();
    await getScriptLocal(makeRequest("../../etc/passwd"), res);

    expect(existsSpy).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalledWith("File not found");
  });

  it("returns 404 for filenames containing double dots", async () => {
    const existsSpy = jest.spyOn(fs, "existsSync");

    const { res, status, send } = makeResponse();
    await getScriptLocal(makeRequest("test..js"), res);

    expect(existsSpy).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalledWith("File not found");
  });
});

describe("handler", () => {
  it("serves the script if found", async () => {
    const scriptContent = 'console.log("hello");';
    const scriptPath = path.resolve(
      __dirname,
      "../../src/static/html/scripts/test.js"
    );
    jest.spyOn(fs, "existsSync").mockImplementation((p) => p === scriptPath);
    jest.spyOn(fs, "readFileSync").mockReturnValue(scriptContent as any);

    const result = await handler(makeEvent("test.js"));

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({ "Content-Type": "application/javascript" });
    expect(result.body).toBe(scriptContent);
  });

  it("returns 404 if script not found", async () => {
    jest.spyOn(fs, "existsSync").mockReturnValue(false);

    const result = await handler(makeEvent("missing.js"));

    expect(result).toEqual({
      statusCode: 404,
      body: "File not found",
      headers: { "Content-Type": "text/plain; charset=UTF-8" },
    });
  });

  it("returns 404 for an empty filename", async () => {
    const existsSpy = jest.spyOn(fs, "existsSync");

    const result = await handler(makeEvent(""));

    expect(existsSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 404,
      body: "File not found",
      headers: { "Content-Type": "text/plain; charset=UTF-8" },
    });
  });

  it("returns 404 when pathParameters is null", async () => {
    const existsSpy = jest.spyOn(fs, "existsSync");

    const result = await handler(makeEvent());

    expect(existsSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 404,
      body: "File not found",
      headers: { "Content-Type": "text/plain; charset=UTF-8" },
    });
  });

  it("returns 404 for path traversal filenames", async () => {
    const existsSpy = jest.spyOn(fs, "existsSync");

    const result = await handler(makeEvent("../../etc/passwd"));

    expect(existsSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 404,
      body: "File not found",
      headers: { "Content-Type": "text/plain; charset=UTF-8" },
    });
  });

  it("returns 404 for filenames containing double dots", async () => {
    const existsSpy = jest.spyOn(fs, "existsSync");

    const result = await handler(makeEvent("test..js"));

    expect(existsSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 404,
      body: "File not found",
      headers: { "Content-Type": "text/plain; charset=UTF-8" },
    });
  });

  it("returns 500 when reading an existing file throws", async () => {
    const scriptPath = path.resolve(
      __dirname,
      "../../src/static/html/scripts/test.js"
    );
    jest.spyOn(fs, "existsSync").mockImplementation((p) => p === scriptPath);
    jest.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("read failed");
    });
    jest.spyOn(console, "log").mockImplementation(() => undefined);

    const result = await handler(makeEvent("test.js"));

    expect(result).toEqual({
      statusCode: 500,
      body: "error has occurred",
      headers: { "Content-Type": "text/plain; charset=UTF-8" },
    });
  });
});
