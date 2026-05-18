import { Router } from "express";
import { requireUser } from "../middlewares/requireUser.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { idParamSchema } from "../validators/programSchemas.js";
import {
  cancelSubscriptionBodySchema,
  createSubscriptionBodySchema,
} from "../validators/billingSchemas.js";
import {
  postCancelBillingSubscription,
  postChangeBillingSubscription,
  postCreateBillingSubscription,
  getBillingSubscriptionMe,
} from "../controllers/billingSubscriptionController.js";

const router = Router();

router.use(requireUser);

/**
 * @openapi
 * /api/v1/billing/subscriptions/me:
 *   get:
 *     tags: [Billing]
 *     summary: Current user's subscription (blocking or latest)
 *     security:
 *       - userBearerAuth: []
 *     responses:
 *       200:
 *         description: >
 *           Subscription summary or null if none. When status is CREATED, `checkout` includes
 *           keyId and subscriptionId for Razorpay Standard Checkout. `refereeBenefit` describes
 *           referral credit for the authenticated user (referee): configured benefit, applied flag,
 *           and status (`APPLIED`, `PENDING`, `NOT_REFERRED`, etc.).
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/subscriptions/me", asyncHandler(getBillingSubscriptionMe));

/**
 * @openapi
 * /api/v1/billing/subscriptions/change:
 *   post:
 *     tags: [Billing]
 *     summary: Cancel current in-progress/active subscription and start a new custom plan
 *     security:
 *       - userBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateSubscriptionRequest' }
 *     responses:
 *       201:
 *         description: >
 *           New subscription created. `shortUrl` is Razorpay's hosted link from the API response
 *           (see Create Subscription). Prefer `data.checkout` (keyId + subscriptionId) with
 *           Standard Checkout per Razorpay's subscriptions integration guide if the short link fails.
 *       404:
 *         description: No subscription to change.
 *       409:
 *         description: Conflict (e.g. another active subscription after cancel — rare).
 *       502:
 *         description: Razorpay rejected the request.
 */
router.post(
  "/subscriptions/change",
  validateRequest({ body: createSubscriptionBodySchema }),
  asyncHandler(postChangeBillingSubscription)
);

/**
 * @openapi
 * /api/v1/billing/subscriptions:
 *   post:
 *     tags: [Billing]
 *     summary: Create a custom-amount recurring subscription (Razorpay Subscription + Plan)
 *     security:
 *       - userBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateSubscriptionRequest' }
 *     responses:
 *       201:
 *         description: >
 *           Subscription row created. Use `data.checkout` (Standard Checkout) or `shortUrl`
 *           (Razorpay-hosted) to complete authorisation; hosted `rzp.io` links depend on account settings.
 *       409:
 *         description: User already has an in-progress or active subscription.
 *       502:
 *         description: Razorpay rejected the request.
 */
router.post(
  "/subscriptions",
  validateRequest({ body: createSubscriptionBodySchema }),
  asyncHandler(postCreateBillingSubscription)
);

/**
 * @openapi
 * /api/v1/billing/subscriptions/{id}/cancel:
 *   post:
 *     tags: [Billing]
 *     summary: Cancel a subscription by internal id
 *     security:
 *       - userBearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CancelSubscriptionRequest' }
 *     responses:
 *       200:
 *         description: Cancel request applied (see subscription status).
 *       404:
 *         description: Subscription not found.
 *       409:
 *         description: Subscription already terminal.
 */
router.post(
  "/subscriptions/:id/cancel",
  validateRequest({
    params: idParamSchema,
    body: cancelSubscriptionBodySchema,
  }),
  asyncHandler(postCancelBillingSubscription)
);

export default router;
