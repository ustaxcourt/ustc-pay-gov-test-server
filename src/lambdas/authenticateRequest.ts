import { UnauthorizedError } from "../errors/UnauthorizedError";
type Headers = { [key: string]: string | string[] | undefined };

export const authenticateRequest = (headers?: Headers) => {

  if (!headers) {
    throw new UnauthorizedError("Missing Authentication");
  }

  let authentication: string = "empty";
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === "authentication") {
      authentication = headers[k] as string;
      break;
    }
  }

  if (authentication !== `Bearer ${process.env.ACCESS_TOKEN}`) {
    throw new UnauthorizedError("Missing Authentication");
  }
};
