import { parse as parseCookieHeader } from "cookie";
import { userAccessTokenCookieName } from "../config/userAccessTokenCookie.js";
import { UnauthorizedError, ForbiddenError } from "../errors/index.js";
import jwt from "jsonwebtoken";

/**
 * Resolves user JWT from `Authorization: Bearer` (preferred) or from the HttpOnly access-token cookie.
 * @param {import("express").Request} req
 * @returns {string | null}
 */
export function resolveUserJwtFromRequest(req) {
  const header = req.headers.authorization;
  if (header && typeof header === "string" && header.startsWith("Bearer ")) {
    const fromBearer = header.slice("Bearer ".length).trim();
    if (fromBearer) {
      return fromBearer;
    }
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader || typeof cookieHeader !== "string") {
    return null;
  }

  const cookies = parseCookieHeader(cookieHeader);
  const name = userAccessTokenCookieName();
  const fromCookie = cookies[name];
  if (fromCookie && typeof fromCookie === "string") {
    const t = fromCookie.trim();
    if (t) {
      return t;
    }
  }
  return null;
}

/**
 * Verifies HS256 JWT for dashboard users. Requires payload.role === "user" and sub (user id).
 * Accepts `Authorization: Bearer <jwt>` or the HttpOnly cookie set by POST /api/v1/auth/signin-referral (same name as `userAccessTokenCookieName()`).
 */
export function requireUser(req, res, next) {
  const secret = process.env.USER_JWT_SECRET;
  if (!secret || secret.trim() === "") {
    return next(
      new Error(
        "USER_JWT_SECRET is not configured. Set USER_JWT_SECRET in environment variables."
      )
    );
  }

  const token = resolveUserJwtFromRequest(req);
  if (!token) {
    return next(
      new UnauthorizedError(
        "Missing or invalid credentials. Send Authorization: Bearer <token> or a valid session cookie."
      )
    );
  }

  try {
    const payload = jwt.verify(token, secret.trim(), { algorithms: ["HS256"] });
    if (!payload || typeof payload !== "object") {
      return next(new UnauthorizedError("Invalid token payload."));
    }
    if (payload.role !== "user") {
      return next(new ForbiddenError("User role required."));
    }
    const id = typeof payload.sub === "string" ? payload.sub : undefined;
    if (!id) {
      return next(new ForbiddenError("Token must include sub (user id)."));
    }
    req.user = {
      id,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
    return next();
  } catch (err) {
    if (err && typeof err === "object" && err.name === "TokenExpiredError") {
      return next(new UnauthorizedError("Token expired."));
    }
    if (err && typeof err === "object" && err.name === "JsonWebTokenError") {
      return next(new UnauthorizedError("Invalid token."));
    }
    return next(err);
  }
}
