import { handleRazorpayWebhook } from "../services/billingWebhookService.js";
import { logStructured } from "../utils/structuredLog.js";

export async function postRazorpayBillingWebhook(req, res) {
  const signatureHeader = req.get("x-razorpay-signature");
  const eventIdHeader = req.get("x-razorpay-event-id");
  const bodyBytes = Buffer.isBuffer(req.body)
    ? req.body.length
    : Buffer.byteLength(String(req.body ?? ""), "utf8");

  logStructured("info", {
    scope: "billing.webhook",
    phase: "ingress",
    method: req.method,
    path: req.originalUrl || req.path,
    hasSignatureHeader: Boolean(
      typeof signatureHeader === "string" && signatureHeader.trim().length > 0
    ),
    hasEventIdHeader: Boolean(
      typeof eventIdHeader === "string" && eventIdHeader.trim().length > 0
    ),
    bodyBytes,
  });

  const result = await handleRazorpayWebhook({
    rawBody: req.body,
    signatureHeader,
    eventIdHeader: eventIdHeader ?? undefined,
  });
  res.status(200).json(result);
}
