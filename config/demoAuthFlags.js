/**
 * Demo passwordless auth is active only when DEMO_AUTH_ENABLED is the literal string "true"
 * and either NODE_ENV is not "production" or DEMO_AUTH_ALLOW_PRODUCTION is "true".
 */
export function isDemoAuthRuntimeEnabled() {
  if (process.env.DEMO_AUTH_ENABLED !== "true") {
    return false;
  }
  if (process.env.NODE_ENV === "production" && process.env.DEMO_AUTH_ALLOW_PRODUCTION !== "true") {
    return false;
  }
  return true;
}
