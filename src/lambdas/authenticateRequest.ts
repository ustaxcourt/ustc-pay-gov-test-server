import { UnauthorizedError } from "../errors/UnauthorizedError";
import { isLocal } from "../config/appEnv";
type Headers = { [key: string]: string | string[] | undefined };

export const authenticateRequest = (headers?: Headers) => {
  // Local development runs without an access token. Terraform
  // refuses to deploy with app_env = "local" so this branch cannot be reached
  // outside a developer's machine — see terraform/variables.tf.
  if (isLocal()) {
    return;
  }


  const expectedToken = process.env.ACCESS_TOKEN;
  if (!expectedToken) {
    throw new UnauthorizedError("Missing Authentication");
  }

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

  if (authentication !== `Bearer ${expectedToken}`) {
    throw new UnauthorizedError("Missing Authentication");
  }
};
