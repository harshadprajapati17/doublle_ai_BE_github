import { Router } from "express";
import { requireUser } from "../middlewares/requireUser.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  referralAttributeBodySchema,
  referralDashboardListQuerySchema,
  referralEmptyBodySchema,
  referralValidateCodeBodySchema,
} from "../validators/referralSchemas.js";
import {
  getActiveReferralProgram,
  getReferralMe,
  getReferralMeDashboard,
  getReferralMeReferees,
  getReferralMeTransactions,
  postAcceptReferralTerms,
  postAttributeReferral,
  postValidateReferralCode,
} from "../controllers/referralController.js";

const router = Router();

/**
 * @openapi
 * /api/v1/referral/code/validate:
 *   post:
 *     tags: [Referral]
 *     summary: Validate a referral code at signup (public)
 *     description: >
 *       Returns whether the code is valid for the currently active program and the referee benefit
 *       from program configuration. Unknown or inactive-program cases return HTTP 200 with valid=false.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 16
 *                 pattern: '^[A-HJKLMNP-Z2-9]{6,16}$'
 *                 example: ABCD2345
 *     responses:
 *       200:
 *         description: Validation result (valid or not).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   oneOf:
 *                     - type: object
 *                       required: [valid]
 *                       properties:
 *                         valid: { const: false }
 *                     - type: object
 *                       required: [valid, programId, code, refereeBenefit]
 *                       properties:
 *                         valid: { const: true }
 *                         programId: { type: string, format: uuid }
 *                         code: { type: string }
 *                         refereeBenefit:
 *                           type: object
 *                           properties:
 *                             type:
 *                               type: string
 *                               enum: [NONE, TRIAL_EXTENSION, CREDIT]
 *                             value: { type: string, nullable: true }
 *                             currency: { type: string }
 *                             trialDays: { type: integer, nullable: true }
 *       400: { description: Invalid body, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post(
  "/code/validate",
  validateRequest({ body: referralValidateCodeBodySchema }),
  asyncHandler(postValidateReferralCode)
);

router.use(requireUser);

/**
 * @openapi
 * /api/v1/referral/program:
 *   get:
 *     tags: [Referral]
 *     summary: Current active referral program (authenticated)
 *     description: >
 *       Returns the globally active referral program configuration for display in the referrer
 *       experience (reward terms, caps, cookie window, terms version). Does not include admin-only
 *       metadata.
 *     security:
 *       - userBearerAuth: []
 *     responses:
 *       200:
 *         description: Active referral program.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/ReferralProgram' }
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404:
 *         description: No active referral program.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 */
router.get("/program", asyncHandler(getActiveReferralProgram));

/**
 * @openapi
 * /api/v1/referral/attribute:
 *   post:
 *     tags: [Referral]
 *     summary: Attribute a referee to a referrer (authenticated signup)
 *     description: >
 *       Called by the signup flow after account creation and login. The authenticated user is recorded
 *       as the referee. Resolves the active program and referral code, blocks self-referral, and creates
 *       one ACTIVE attribution per referee per program. Referee benefit is not applied in this step.
 *     security:
 *       - userBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 16
 *                 pattern: '^[A-HJKLMNP-Z2-9]{6,16}$'
 *                 example: ABCD2345
 *               source:
 *                 type: string
 *                 enum: [LINK, MANUAL_CODE, COOKIE, BOTH]
 *                 description: Attribution channel; defaults to LINK when omitted.
 *               cookieData:
 *                 type: object
 *                 additionalProperties: true
 *                 nullable: true
 *                 description: Opaque first-party cookie payload (code, timestamp, etc.).
 *               ip:
 *                 type: string
 *                 maxLength: 45
 *                 nullable: true
 *               userAgent:
 *                 type: string
 *                 maxLength: 2048
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Referral attribution created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   required:
 *                     - id
 *                     - refereeUserId
 *                     - referrerUserId
 *                     - programId
 *                     - code
 *                     - status
 *                     - attributionSource
 *                     - programVersionAtAttribution
 *                     - refereeCreditApplied
 *                     - createdAt
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     refereeUserId: { type: string }
 *                     referrerUserId: { type: string }
 *                     programId: { type: string, format: uuid }
 *                     code: { type: string }
 *                     status: { type: string, enum: [ACTIVE, TERMINATED, FRAUD_REJECTED] }
 *                     attributionSource:
 *                       type: string
 *                       enum: [LINK, MANUAL_CODE, COOKIE, BOTH]
 *                     programVersionAtAttribution: { type: integer }
 *                     refereeCreditApplied: { type: boolean }
 *                     createdAt: { type: string, format: date-time }
 *       400:
 *         description: Validation error or self-referral blocked.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404:
 *         description: No active program or referral code not found.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       409:
 *         description: Referee already attributed for this program.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 */
router.post(
  "/attribute",
  validateRequest({ body: referralAttributeBodySchema }),
  asyncHandler(postAttributeReferral)
);

/**
 * @openapi
 * /api/v1/referral/me/dashboard:
 *   get:
 *     tags: [Referral]
 *     summary: Referrer dashboard (single payload)
 *     description: >
 *       Returns referral code, aggregate summary, and paginated referees each with profile (email/name),
 *       payment status (captured subscription payments), commission totals, and commission line items.
 *     security:
 *       - userBearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Dashboard payload.
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404:
 *         description: No active program or referrer has no referral code yet.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 */
router.get(
  "/me/dashboard",
  validateRequest({ query: referralDashboardListQuerySchema }),
  asyncHandler(getReferralMeDashboard)
);

/**
 * @openapi
 * /api/v1/referral/me/referees:
 *   get:
 *     tags: [Referral]
 *     summary: Paginated referees for the referrer (active program)
 *     security:
 *       - userBearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: >
 *           Referee rows with per-referee commission totals, program `refereeBenefit` (e.g. CREDIT 500),
 *           and `refereeCreditApplied` / `refereeCreditAppliedAt` after first captured payment.
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: No active referral program, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get(
  "/me/referees",
  validateRequest({ query: referralDashboardListQuerySchema }),
  asyncHandler(getReferralMeReferees)
);

/**
 * @openapi
 * /api/v1/referral/me/transactions:
 *   get:
 *     tags: [Referral]
 *     summary: Paginated commission events for the referrer (active program)
 *     security:
 *       - userBearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Commission ledger events (pending, earned, paid, clawed back).
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: No active referral program, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get(
  "/me/transactions",
  validateRequest({ query: referralDashboardListQuerySchema }),
  asyncHandler(getReferralMeTransactions)
);

/**
 * @openapi
 * /api/v1/referral/me:
 *   get:
 *     tags: [Referral]
 *     summary: Referral code and dashboard summary for the active program
 *     security:
 *       - userBearerAuth: []
 *     responses:
 *       200:
 *         description: Referral code and aggregate stats (referee count, commission totals).
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: No active program or user has no referral code yet, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/me", asyncHandler(getReferralMe));

/**
 * @openapi
 * /api/v1/referral/terms/accept:
 *   post:
 *     tags: [Referral]
 *     summary: Accept active referral program terms and return referral code (FR-3, single call)
 *     security:
 *       - userBearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *     responses:
 *       200:
 *         description: Terms were already accepted; code returned (existing or newly allocated).
 *       201:
 *         description: Terms acceptance recorded; code returned (existing or newly allocated).
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404:
 *         description: No active referral program.
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 */
router.post(
  "/terms/accept",
  validateRequest({ body: referralEmptyBodySchema }),
  asyncHandler(postAcceptReferralTerms)
);

export default router;
