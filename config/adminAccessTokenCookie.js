const DEFAULT_COOKIE_NAME = "doublle_admin_access_token";

/**
 * HttpOnly cookie that mirrors the admin JWT for browser clients.
 * Optional override via `ADMIN_ACCESS_TOKEN_COOKIE_NAME`.
 * @returns {string}
 */
export function adminAccessTokenCookieName() {
  const raw = process.env.ADMIN_ACCESS_TOKEN_COOKIE_NAME;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed !== "" ? trimmed : DEFAULT_COOKIE_NAME;
}

/**
 * @param {number} expiresInSeconds
 * @returns {import("express").CookieOptions}
 */
export function adminAccessTokenCookieOptions(expiresInSeconds) {
  const sec = Math.max(0, Math.floor(Number(expiresInSeconds) || 0));
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sec * 1000,
    path: "/",
  };
}
