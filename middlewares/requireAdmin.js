const jwt = require("jsonwebtoken");
const { UnauthorizedError, ForbiddenError } = require("../errors");

/**
 * Verifies HS256 Bearer JWT. Requires payload.role === "admin" and sub (actor id).
 */
function requireAdmin(req, res, next) {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.trim() === "") {
    return next(
      new Error(
        "ADMIN_JWT_SECRET is not configured. Set ADMIN_JWT_SECRET in environment variables."
      )
    );
  }

  const header = req.headers.authorization;
  if (!header || typeof header !== "string" || !header.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing or invalid Authorization header."));
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return next(new UnauthorizedError("Missing bearer token."));
  }

  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
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

module.exports = { requireAdmin };
