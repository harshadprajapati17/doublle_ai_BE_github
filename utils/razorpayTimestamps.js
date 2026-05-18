/**
 * Razorpay returns Unix seconds or ms depending on API; normalize to Date or null.
 * @param {unknown} value
 * @returns {Date | null}
 */
export function parseRazorpayTimestamp(value) {
  if (value == null || value === "") return null;
  const n = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > 1e12) return new Date(n);
  return new Date(n * 1000);
}
