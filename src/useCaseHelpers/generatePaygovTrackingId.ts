import { randomBytes } from "crypto";

const ALPHANUMERIC =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const generatePaygovTrackingId = (): string => {
  const bytes = randomBytes(21);
  return Array.from(bytes, (b) => ALPHANUMERIC[b % ALPHANUMERIC.length]).join(
    ""
  );
};
