import { mapRazorpaySubscriptionStatus } from "./billingRzpMappers.js";
import { parseRazorpayTimestamp } from "./razorpayTimestamps.js";

/**
 * Build a Prisma update payload from a Razorpay subscription API object
 * (webhook entity or `subscriptions.fetch` response; snake_case fields).
 *
 * @param {Record<string, unknown>} entity
 * @returns {import("../generated/prisma/client.ts").Prisma.SubscriptionUpdateInput | null}
 */
export function subscriptionUpdateInputFromRzpEntity(entity) {
  if (!entity || typeof entity !== "object") return null;
  const e = /** @type {Record<string, unknown>} */ (entity);
  const rid = typeof e.id === "string" ? e.id : "";
  if (!rid.startsWith("sub_")) return null;

  const status = mapRazorpaySubscriptionStatus(e.status);

  /** @type {import("../generated/prisma/client.ts").Prisma.SubscriptionUpdateInput} */
  const patch = { status };

  if ("current_start" in e) {
    patch.currentStart = parseRazorpayTimestamp(e.current_start);
  }
  if ("current_end" in e) {
    patch.currentEnd = parseRazorpayTimestamp(e.current_end);
  }
  if ("charge_at" in e) {
    patch.nextChargeAt = parseRazorpayTimestamp(e.charge_at);
  }
  if (Number.isFinite(Number(e.paid_count))) {
    patch.paidCount = Number(e.paid_count);
  }
  if (typeof e.short_url === "string") {
    patch.shortUrl = e.short_url;
  }
  if (status === "CANCELLED" || status === "COMPLETED" || status === "EXPIRED") {
    patch.cancelledAt = new Date();
  }

  return patch;
}
