import { parse as parseCookieHeader } from "cookie";
import { adminAccessTokenCookieName } from "../config/adminAccessTokenCookie.js";
import { UnauthorizedError, ForbiddenError } from "../errors/index.js";
import {
  secretsFromEnv,
  verifyJwtHs256WithSecrets,
} from "../utils/verifyJwtHs256WithSecrets.js";

const ADMIN_JWT_ENV_NAMES = ["ADMIN_JWT_SECRET", "ADMIN_JWT_SECRET_2", "ADMIN_JWT_SECRET_3"];

/**
 * Resolves admin JWT from `Authorization: Bearer` (preferred) or from the HttpOnly access-token cookie.
 * @param {import("express").Request} req
 * @returns {string | null}
 */
export function resolveAdminJwtFromRequest(req) {
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
  const name = adminAccessTokenCookieName();
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
 * Verifies HS256 Bearer JWT. Requires payload.role === "admin" and sub (actor id).
 * Accepts `Authorization: Bearer <jwt>` or the HttpOnly cookie set by POST /api/v1/auth/demo-admin.
 * Tokens may be signed with ADMIN_JWT_SECRET, ADMIN_JWT_SECRET_2, or ADMIN_JWT_SECRET_3 when set (demo / multi-issuer).
 */
export function requireAdmin(req, res, next) {
  const primary = process.env.ADMIN_JWT_SECRET;
  if (!primary || primary.trim() === "") {
    return next(
      new Error(
        "ADMIN_JWT_SECRET is not configured. Set ADMIN_JWT_SECRET in environment variables."
      )
    );
  }
  const secrets = secretsFromEnv(ADMIN_JWT_ENV_NAMES);

  const token = resolveAdminJwtFromRequest(req);
  if (!token) {
    return next(
      new UnauthorizedError(
        "Missing or invalid credentials. Send Authorization: Bearer <token> or a valid session cookie."
      )
    );
  }

  try {
    const payload = verifyJwtHs256WithSecrets(token, secrets);
    if (!payload || typeof payload !== "object") {
      return next(new UnauthorizedError("Invalid token payload."));
    }
    if (payload.role !== "admin") {
      return next(new ForbiddenError("Admin role required."));
    }
    const id = typeof payload.sub === "string" ? payload.sub : undefined;
    if (!id) {
      return next(new ForbiddenError("Token must include sub (admin id)."));
    }
    req.admin = {
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
