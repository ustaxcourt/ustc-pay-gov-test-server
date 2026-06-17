import { randomInt } from "crypto";

const ALLOWED_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ";
const EDGE_ALLOWED_CHARACTERS = ALLOWED_CHARACTERS.replace(/ /g, "");

export const generatePaygovTrackingId = (): string => {
  const leading =
    EDGE_ALLOWED_CHARACTERS[randomInt(EDGE_ALLOWED_CHARACTERS.length)];
  const middle = Array.from(
    { length: 19 },
    () => ALLOWED_CHARACTERS[randomInt(ALLOWED_CHARACTERS.length)],
  ).join("");
  const trailing =
    EDGE_ALLOWED_CHARACTERS[randomInt(EDGE_ALLOWED_CHARACTERS.length)];

  return leading + middle + trailing;
};

export const paygovTrackingIdRegex =
  /^[A-Za-z0-9]{1}[A-Za-z0-9 ]{19}[A-Za-z0-9]{1}$/;
