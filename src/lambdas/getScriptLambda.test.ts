import { getScriptLocal } from "./getScriptLambda";
import fs from "fs";
import path from "path";

describe("getScriptLocal", () => {
  const makeEvent = (file: string) =>
    ({
      pathParameters: { file },
    } as unknown as AWSLambda.APIGatewayProxyEvent);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("serves the script if found", async () => {
    const scriptContent = 'console.log("hello");';
    const scriptPath = path.resolve(
      __dirname,
      "../../src/static/html/scripts/test.js"
    );
    jest.spyOn(fs, "existsSync").mockImplementation((p) => p === scriptPath);
    jest.spyOn(fs, "readFileSync").mockImplementation((p) => {
      if (p === scriptPath) return scriptContent;
      throw new Error("not found");
    });

    const result = await getScriptLocal(makeEvent("test.js"));

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({ "Content-Type": "application/javascript" });
    expect(result.body).toBe(scriptContent);
  });

  it("returns 404 if script not found", async () => {
    jest.spyOn(fs, "existsSync").mockReturnValue(false);

    const result = await getScriptLocal(makeEvent("missing.js"));

    expect(result).toEqual({ statusCode: 404, body: "File not found" });
  });

  it("returns 404 for an empty filename", async () => {
    const existsSpy = jest.spyOn(fs, "existsSync");

    const result = await getScriptLocal(makeEvent(""));

    expect(existsSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ statusCode: 404, body: "File not found" });
  });

  it("returns 404 for path traversal filenames", async () => {
    const existsSpy = jest.spyOn(fs, "existsSync");

    const result = await getScriptLocal(makeEvent("../../etc/passwd"));

    expect(existsSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ statusCode: 404, body: "File not found" });
  });

  it("returns 404 for filenames containing double dots", async () => {
    const existsSpy = jest.spyOn(fs, "existsSync");

    const result = await getScriptLocal(makeEvent("test..js"));

    expect(existsSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ statusCode: 404, body: "File not found" });
  });
});
