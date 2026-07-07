import { randomInt } from "crypto";

export function generateSixDigitPassword() {
  return String(randomInt(100000, 1000000));
}
