import { Router } from "express";
import { requireAdmin } from "../../middlewares/requireAdmin.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import {
  idParamSchema,
  listAdminReferralsQuerySchema,
  referralDecisionBodySchema,
} from "../../validators/adminReferralSchemas.js";
import {
  getAdminReferral,
  getAdminReferrals,
  postAdminReferralDecision,
} from "../../controllers/admin/referralController.js";

const router = Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/v1/admin/referrals:
 *   get:
 *     tags: [Admin · Referrals]
 *     summary: Search referrals (referrer, referee, code, status, date range)
 *     description: >
 *       Each row includes `referrer` and `referee` profiles (from `demo_users`) and `payment`
 *       for the referee (`hasPaid`, captured count, first paid at, total amount).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: referrerUserId
 *         schema: { type: string }
 *       - in: query
 *         name: refereeUserId
 *         schema: { type: string }
 *       - in: query
 *         name: code
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, TERMINATED, FRAUD_REJECTED] }
 *       - in: query
 *         name: programId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: createdFrom
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: createdTo
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated referral rows.
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get(
  "/",
  validateRequest({ query: listAdminReferralsQuerySchema }),
  asyncHandler(getAdminReferrals)
);

/**
 * @openapi
 * /api/v1/admin/referrals/{id}:
 *   get:
 *     tags: [Admin · Referrals]
 *     summary: Referral inspector detail (referral, commissions, fraud signals)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Referral detail with related records.
 *       404: { description: Not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get(
  "/:id",
  validateRequest({ params: idParamSchema }),
  asyncHandler(getAdminReferral)
);

/**
 * @openapi
 * /api/v1/admin/referrals/{id}/decision:
 *   post:
 *     tags: [Admin · Referrals]
 *     summary: Approve, reject (fraud), or terminate a referral
 *     description: >
 *       REJECT sets status FRAUD_REJECTED and blocks future commission accrual for the referee.
 *       Mandatory note is stored on the referral and in AdminAuditLog.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [decision, note]
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [APPROVE, REJECT, TERMINATE]
 *               note:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: Updated referral.
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post(
  "/:id/decision",
  validateRequest({ params: idParamSchema, body: referralDecisionBodySchema }),
  asyncHandler(postAdminReferralDecision)
);

export default router;
