import crypto from "node:crypto";

/**
 * @param {Buffer | string} rawBody
 * @param {string | undefined} signatureHeader
 * @param {string} secret
 */
export function verifyRazorpayWebhookSignature(rawBody, signatureHeader, secret) {
  if (!secret || secret.trim() === "") return false;
  const sig = typeof signatureHeader === "string" ? signatureHeader.trim() : "";
  if (!sig) return false;
  const buf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), "utf8");
  const expected = crypto.createHmac("sha256", secret).update(buf).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sig, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
