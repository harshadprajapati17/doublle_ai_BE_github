/** @typedef {import("../generated/prisma/client.ts").SubscriptionStatus} SubscriptionStatus */
/** @typedef {import("../generated/prisma/client.ts").SubscriptionPaymentStatus} SubscriptionPaymentStatus */

/**
 * @param {unknown} status
 * @returns {SubscriptionStatus}
 */
export function mapRazorpaySubscriptionStatus(status) {
  const s = String(status ?? "").toLowerCase();
  switch (s) {
    case "created":
      return "CREATED";
    case "authenticated":
      return "AUTHENTICATED";
    case "active":
      return "ACTIVE";
    case "pending":
      return "PENDING";
    case "halted":
      return "HALTED";
    case "paused":
      return "PAUSED";
    case "cancelled":
      return "CANCELLED";
    case "completed":
      return "COMPLETED";
    case "expired":
      return "EXPIRED";
    default:
      return "CREATED";
  }
}

/**
 * @param {unknown} status
 * @returns {SubscriptionPaymentStatus}
 */
export function mapRazorpayPaymentStatus(status) {
  const s = String(status ?? "").toLowerCase();
  switch (s) {
    case "authorized":
      return "AUTHORIZED";
    case "captured":
      return "CAPTURED";
    case "failed":
      return "FAILED";
    case "refunded":
      return "REFUNDED";
    default:
      return "CREATED";
  }
}
