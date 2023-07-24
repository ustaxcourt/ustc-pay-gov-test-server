import { UnauthorizedError } from "../errors/UnauthorizedError";

export const authenticateRequest = (token?: string) => {
  if (!token || token !== `Bearer ${process.env.ACCESS_TOKEN}`) {
    throw new UnauthorizedError("Missing Authentication");
  }
};
