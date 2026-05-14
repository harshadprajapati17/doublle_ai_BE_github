import { Router } from "express";
import { requireUser } from "../middlewares/requireUser.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { referralEmptyBodySchema, referralValidateCodeBodySchema } from "../validators/referralSchemas.js";
import {
  getReferralMe,
  postAcceptReferralTerms,
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
 * /api/v1/referral/me:
 *   get:
 *     tags: [Referral]
 *     summary: Current user's referral code and link for the active program
 *     security:
 *       - userBearerAuth: []
 *     responses:
 *       200:
 *         description: Referral code and URL (user has a code under the active program).
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: No active program or user has no referral code yet, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       503: { description: Server misconfiguration (REFERRAL_PUBLIC_BASE_URL), content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get("/me", asyncHandler(getReferralMe));

/**
 * @openapi
 * /api/v1/referral/terms/accept:
 *   post:
 *     tags: [Referral]
 *     summary: Accept active referral program terms and return referral link/code (FR-3, single call)
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
 *         description: Terms were already accepted; link/code returned (existing or newly allocated code).
 *       201:
 *         description: Terms acceptance recorded; link/code returned (existing or newly allocated code).
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
