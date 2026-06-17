import { randomInt } from "crypto";

const ALLOWED_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ";

export const generatePaygovTrackingId = (): string => {
  const chars = Array.from(
    { length: 21 },
    () => ALLOWED_CHARACTERS[randomInt(ALLOWED_CHARACTERS.length)],
  );

  const nonSpaceLength = ALLOWED_CHARACTERS.length - 1;
  chars[0] = ALLOWED_CHARACTERS[randomInt(nonSpaceLength)];
  chars[20] = ALLOWED_CHARACTERS[randomInt(nonSpaceLength)];

  return chars.join("");
};

export const paygovTrackingIdRegex =
  /^[A-Za-z0-9]{1}[A-Za-z0-9 ]{19}[A-Za-z0-9]{1}$/;
