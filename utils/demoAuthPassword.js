import crypto from "node:crypto";

/**
 * When `DEMO_AUTH_PASSWORD` is unset, demo login does not require a password.
 * @param {string | undefined} provided
 */
export function demoPasswordMatches(provided) {
  const expected = process.env.DEMO_AUTH_PASSWORD;
  if (expected === undefined || expected === "") {
    return true;
  }
  if (typeof provided !== "string") {
    return false;
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
