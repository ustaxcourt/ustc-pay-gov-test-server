import { randomInt } from "crypto";

const ALLOWED_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const generateCharWithoutSpace = () => {
  return ALLOWED_CHARACTERS[randomInt(ALLOWED_CHARACTERS.length)];
};

export const generatePaygovTrackingId = (): string => {
  const charsWithSpace = ALLOWED_CHARACTERS + " ";

  const firstChar = generateCharWithoutSpace();
  const lastChar = generateCharWithoutSpace();
  const midChars = Array.from(
    { length: 19 },
    () => charsWithSpace[randomInt(charsWithSpace.length)],
  ).join("");

  return firstChar + midChars + lastChar;
};

export const paygovTrackingIdRegex =
  /^[A-Za-z0-9]{1}[A-Za-z0-9 ]{19}[A-Za-z0-9]{1}$/;
