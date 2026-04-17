import { randomInt } from "crypto";

const ALPHANUMERIC =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const generatePaygovTrackingId = (): string => {
  return Array.from({ length: 21 }, () =>
    ALPHANUMERIC[randomInt(ALPHANUMERIC.length)]
  ).join("");
};
