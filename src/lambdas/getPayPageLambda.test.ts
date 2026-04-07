import { v4 as uuidv4 } from "uuid";
import { handler as getPayPageHandler } from "./getPayPageLambda";
import * as appContextModule from "../appContext";

describe("getPayPageLambda.handler", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return 400 when token is missing", async () => {
    const response = await getPayPageHandler({} as AWSLambda.APIGatewayProxyEvent);

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe("No token found");
  });

  it("should return 200 and html when token is provided", async () => {
    const showPayPage = jest.fn().mockResolvedValue("<html>pay page</html>");
    jest.spyOn(appContextModule, "createAppContext").mockReturnValue({
      useCases: () => ({
        showPayPage,
      }),
    } as unknown as ReturnType<typeof appContextModule.createAppContext>);

    const response = await getPayPageHandler({
      queryStringParameters: {
        token: "valid-token",
      },
    } as unknown as AWSLambda.APIGatewayProxyEvent);

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({
      "Content-Type": "text/html; charset=UTF-8",
    });
    expect(response.body).toBe("<html>pay page</html>");
    expect(showPayPage).toHaveBeenCalledWith(expect.anything(), {
      token: "valid-token",
    });
  });

  it("should return 500 when getPayPage throws", async () => {
    const showPayPage = jest.fn().mockRejectedValue(new Error("boom"));
    jest.spyOn(appContextModule, "createAppContext").mockReturnValue({
      useCases: () => ({
        showPayPage,
      }),
    } as unknown as ReturnType<typeof appContextModule.createAppContext>);
    jest.spyOn(console, "log").mockImplementation(() => undefined);

    const response = await getPayPageHandler({
      queryStringParameters: {
        token: `token-${uuidv4()}`,
      },
    } as unknown as AWSLambda.APIGatewayProxyEvent);

    expect(response.statusCode).toBe(500);
    expect(response.body).toBe("error has occurred");
    expect(showPayPage).toHaveBeenCalledTimes(1);
  });
});
