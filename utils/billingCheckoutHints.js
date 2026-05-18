/**
 * Razorpay recommends Standard Checkout with `subscription_id` for the auth payment.
 * @see https://razorpay.com/docs/payments/subscriptions/integration-guide/
 *
 * @param {string} razorpaySubId
 * @param {string} status
 * @returns {{ keyId: string; subscriptionId: string } | null}
 */
export function subscriptionStandardCheckoutHints(razorpaySubId, status) {
  if (status !== "CREATED") return null;
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (typeof keyId !== "string" || !keyId || !razorpaySubId) return null;
  return { keyId, subscriptionId: razorpaySubId };
}
