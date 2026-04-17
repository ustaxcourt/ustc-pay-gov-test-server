import { randomInt } from "crypto";

const ALLOWED_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ";

export const generatePaygovTrackingId = (): string => {
  return Array.from({ length: 21 }, () =>
    ALLOWED_CHARACTERS[randomInt(ALLOWED_CHARACTERS.length)]
  ).join("");
};
