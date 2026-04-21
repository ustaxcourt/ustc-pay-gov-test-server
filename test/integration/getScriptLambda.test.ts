import { getScriptLocal } from "../../src/lambdas/getScriptLambda";
import { describe, expect, it } from "@jest/globals";

describe("getScriptLocal integration", () => {
  const makeEvent = (file: string) =>
    ({
      pathParameters: { file },
    } as unknown as AWSLambda.APIGatewayProxyEvent);

  it("serves the override script", async () => {
    const response = await getScriptLocal(makeEvent("override-links.js"));

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({
      "Content-Type": "application/javascript",
    });
    expect(response.body).toContain("a[data-payment-method][data-payment-status]");
    expect(response.body).toContain(
      "/pay/${encodeURIComponent(method)}/${encodeURIComponent(status)}?token=${encodeURIComponent(token)}"
    );
    expect(response.body).toContain("No token found");
  });

  it("returns 404 when the script file does not exist", async () => {
    const response = await getScriptLocal(makeEvent("missing-script.js"));

    expect(response.statusCode).toBe(404);
    expect(response.body).toBe("File not found");
  });
});
