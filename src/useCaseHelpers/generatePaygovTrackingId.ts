import { randomInt } from "crypto";

const ALLOWED_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ";

export const generatePaygovTrackingId = (): string => {
  return Array.from({ length: 21 }, () =>
    ALLOWED_CHARACTERS[randomInt(ALLOWED_CHARACTERS.length)]
  ).join("");
};

export const paygovTrackingIdRegex = /^[A-Za-z0-9 ]{21}$/;
