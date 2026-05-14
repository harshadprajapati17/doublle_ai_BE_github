import { UnauthorizedError, ForbiddenError } from "../errors/index.js";
import {
  secretsFromEnv,
  verifyJwtHs256WithSecrets,
} from "../utils/verifyJwtHs256WithSecrets.js";

const USER_JWT_ENV_NAMES = ["USER_JWT_SECRET", "USER_JWT_SECRET_2", "USER_JWT_SECRET_3"];

/**
 * Verifies HS256 Bearer JWT for dashboard users. Requires payload.role === "user" and sub (user id).
 * Accepts tokens signed with USER_JWT_SECRET, USER_JWT_SECRET_2, or USER_JWT_SECRET_3 when set (demo / multi-issuer).
 */
export function requireUser(req, res, next) {
  const primary = process.env.USER_JWT_SECRET;
  if (!primary || primary.trim() === "") {
    return next(
      new Error(
        "USER_JWT_SECRET is not configured. Set USER_JWT_SECRET in environment variables."
      )
    );
  }
  const secrets = secretsFromEnv(USER_JWT_ENV_NAMES);

  const header = req.headers.authorization;
  if (!header || typeof header !== "string" || !header.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing or invalid Authorization header."));
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return next(new UnauthorizedError("Missing bearer token."));
  }

  try {
    const payload = verifyJwtHs256WithSecrets(token, secrets);
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
