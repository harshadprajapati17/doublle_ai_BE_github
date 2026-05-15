const DEFAULT_COOKIE_NAME = "doublle_access_token";

/**
 * HttpOnly cookie that mirrors the user JWT for browser clients.
 * Optional override via `USER_ACCESS_TOKEN_COOKIE_NAME`.
 * @returns {string}
 */
export function userAccessTokenCookieName() {
  const raw = process.env.USER_ACCESS_TOKEN_COOKIE_NAME;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed !== "" ? trimmed : DEFAULT_COOKIE_NAME;
}

/**
 * @param {number} expiresInSeconds
 * @returns {import("express").CookieOptions}
 */
export function userAccessTokenCookieOptions(expiresInSeconds) {
  const sec = Math.max(0, Math.floor(Number(expiresInSeconds) || 0));
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sec * 1000,
    path: "/",
  };
}
