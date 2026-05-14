import jwt from "jsonwebtoken";

/**
 * Reads non-empty trimmed secrets from process.env in order.
 * @param {readonly string[]} envNames
 * @returns {string[]}
 */
export function secretsFromEnv(envNames) {
  const out = [];
  for (const name of envNames) {
    const v = process.env[name];
    if (typeof v === "string" && v.trim() !== "") {
      out.push(v.trim());
    }
  }
  return out;
}

/**
 * Verifies HS256 JWT against the first matching secret. Used for demo / rotation
 * (multiple issuer secrets with the same payload rules).
 *
 * @param {string} token
 * @param {readonly string[]} secrets
 * @returns {object}
 */
export function verifyJwtHs256WithSecrets(token, secrets) {
  if (secrets.length === 0) {
    throw new jwt.JsonWebTokenError("No signing secrets configured.");
  }
  let lastInvalid = null;
  for (const secret of secrets) {
    try {
      const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
      if (!payload || typeof payload !== "object") {
        throw new jwt.JsonWebTokenError("Invalid token payload.");
      }
      return payload;
    } catch (err) {
      if (err && typeof err === "object" && err.name === "TokenExpiredError") {
        throw err;
      }
      if (err && typeof err === "object" && err.name === "JsonWebTokenError") {
        lastInvalid = err;
        continue;
      }
      throw err;
    }
  }
  throw lastInvalid ?? new jwt.JsonWebTokenError("Invalid token.");
}
