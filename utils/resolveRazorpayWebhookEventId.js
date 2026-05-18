import crypto from "node:crypto";

const MAX_EVENT_ID_LEN = 64;

/**
 * Razorpay recommends deduplicating using the `x-razorpay-event-id` request header.
 * Some payloads omit a root-level `id`; prefer the header, then body fields, then a
 * stable SHA-256 of the raw body (fits `webhook_events.event_id` VarChar(64)).
 *
 * @see https://razorpay.com/docs/webhooks/best-practices/
 *
 * @param {{
 *   json: Record<string, unknown>;
 *   rawBody: Buffer | string;
 *   eventIdHeader: string | undefined;
 * }} p
 * @returns {{ eventId: string; source: "header" | "body_id" | "body_event_id" | "body_hash" }}
 */
export function resolveRazorpayWebhookEventId(p) {
  const h = typeof p.eventIdHeader === "string" ? p.eventIdHeader.trim() : "";
  if (h.length > 0) {
    return { eventId: h.slice(0, MAX_EVENT_ID_LEN), source: "header" };
  }

  const j = p.json;
  const bodyId = typeof j.id === "string" ? j.id.trim() : "";
  if (bodyId.length > 0) {
    return { eventId: bodyId.slice(0, MAX_EVENT_ID_LEN), source: "body_id" };
  }

  const alt = typeof j.event_id === "string" ? j.event_id.trim() : "";
  if (alt.length > 0) {
    return { eventId: alt.slice(0, MAX_EVENT_ID_LEN), source: "body_event_id" };
  }

  const buf = Buffer.isBuffer(p.rawBody)
    ? p.rawBody
    : Buffer.from(String(p.rawBody ?? ""), "utf8");
  const hash = crypto.createHash("sha256").update(buf).digest("hex");
  return { eventId: hash, source: "body_hash" };
}
