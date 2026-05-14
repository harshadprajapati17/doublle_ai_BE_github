/**
 * Best-effort client IP for audit logs (FR-3). Prefer first hop in X-Forwarded-For when present.
 * @param {import('express').Request} req
 * @returns {string}
 */
export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim() !== "") {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 45);
  }
  const socketIp = req.socket?.remoteAddress;
  if (typeof socketIp === "string" && socketIp !== "") {
    return socketIp.slice(0, 45);
  }
  return "unknown";
}
