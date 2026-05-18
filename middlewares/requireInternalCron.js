import { ServiceMisconfiguredError, UnauthorizedError } from "../errors/index.js";

/**
 * Protects internal cron/maintenance routes via shared secret header.
 * Set INTERNAL_CRON_SECRET and send `X-Internal-Cron-Secret: <value>`.
 */
export function requireInternalCron(req, res, next) {
  const secret = process.env.INTERNAL_CRON_SECRET;
  if (!secret || secret.trim() === "") {
    return next(
      new ServiceMisconfiguredError(
        "INTERNAL_CRON_SECRET is not configured. Set it to call internal commission jobs."
      )
    );
  }

  const header = req.get("X-Internal-Cron-Secret");
  if (typeof header !== "string" || header !== secret) {
    return next(new UnauthorizedError("Invalid or missing internal cron secret."));
  }

  return next();
}
