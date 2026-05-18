import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { postRazorpayBillingWebhook } from "../controllers/billingWebhookController.js";

const router = Router();

/**
 * @openapi
 * /api/v1/billing/webhooks/razorpay:
 *   post:
 *     tags: [Billing]
 *     summary: Razorpay webhook receiver (raw JSON body; HMAC verified)
 *     description: >
 *       Uses `application/json` raw body for signature verification. Configure this URL
 *       in the Razorpay dashboard (Test/Live mode must match your API keys) with the same
 *       `RAZORPAY_WEBHOOK_SECRET` as used here. Razorpay sends `X-Razorpay-Event-Id` (dedupe id);
 *       the handler uses it when the JSON body has no root `id`. Razorpay cannot reach localhost
 *       — use ngrok or similar for local testing. Server logs JSON with `scope":"billing.webhook"`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Razorpay event payload
 *     responses:
 *       200:
 *         description: Event accepted (may be duplicate replay).
 *       400:
 *         description: Invalid JSON or payload.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Invalid webhook signature.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       503:
 *         description: Webhook secret not configured.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post("/", asyncHandler(postRazorpayBillingWebhook));

export default router;
