import { Router } from "express";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  referralSignInBodySchema,
  referralUserSignupBodySchema,
  referralAdminSignupBodySchema,
} from "../validators/referralAuthSchemas.js";
import {
  postSignupReferral,
  postSigninReferral,
  postAdminSignupReferral,
  postAdminSigninReferral,
} from "../controllers/referralAuthController.js";

const router = Router();

/**
 * @openapi
 * /api/v1/auth/signup-referral:
 *   post:
 *     tags: [Auth · Referral]
 *     summary: User sign-up (demo_users + JWT + optional referral attribution)
 *     description: >
 *       Creates a `demo_users` row with email and password, mints a 24h user JWT, and sets the
 *       HttpOnly session cookie. When `referral.code` is provided, runs attribution fail-open
 *       (signup still succeeds if the code is invalid, self-referral, or no active program).
 *       Duplicate email returns 409.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ReferralAuthUserSignupRequest' }
 *     responses:
 *       201:
 *         description: Account created; Bearer token and optional referral outcome.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ReferralAuthUserSignupSuccess' }
 *       400:
 *         description: Validation error.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Email already registered.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       503:
 *         description: Misconfiguration (e.g. `USER_JWT_SECRET` missing).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  "/signup-referral",
  validateRequest({ body: referralUserSignupBodySchema }),
  asyncHandler(postSignupReferral)
);

/**
 * @openapi
 * /api/v1/auth/signin-referral:
 *   post:
 *     tags: [Auth · Referral]
 *     summary: User sign-in (demo_users email + password)
 *     description: >
 *       Verifies credentials against `demo_users` (`is_enabled=true`), mints an HS256 JWT with
 *       `USER_JWT_SECRET` and payload `{ sub, role: "user", email }` (24h exp), compatible with
 *       `requireUser`. On success, sets the HttpOnly session cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ReferralAuthSignInRequest' }
 *     responses:
 *       200:
 *         description: Bearer access token for dashboard user APIs.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ReferralAuthSignInSuccess' }
 *       400:
 *         description: Validation error.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Invalid email or password.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       503:
 *         description: Misconfiguration (e.g. `USER_JWT_SECRET` missing).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  "/signin-referral",
  validateRequest({ body: referralSignInBodySchema }),
  asyncHandler(postSigninReferral)
);

/**
 * @openapi
 * /api/v1/auth/admin-signup-referral:
 *   post:
 *     tags: [Auth · Referral]
 *     summary: Admin sign-up (demo_admins + JWT)
 *     description: >
 *       Creates a `demo_admins` row with email and password, mints a 24h admin JWT, and sets the
 *       HttpOnly admin session cookie. Duplicate email returns 409.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ReferralAuthAdminSignupRequest' }
 *     responses:
 *       201:
 *         description: Account created; Bearer token and admin profile.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ReferralAuthAdminSignupSuccess' }
 *       400:
 *         description: Validation error.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Email already registered.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       503:
 *         description: Misconfiguration (e.g. `ADMIN_JWT_SECRET` missing).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  "/admin-signup-referral",
  validateRequest({ body: referralAdminSignupBodySchema }),
  asyncHandler(postAdminSignupReferral)
);

/**
 * @openapi
 * /api/v1/auth/admin-signin-referral:
 *   post:
 *     tags: [Auth · Referral]
 *     summary: Admin sign-in (demo_admins email + password)
 *     description: >
 *       Verifies credentials against `demo_admins` (`is_enabled=true`), mints an HS256 JWT with
 *       `ADMIN_JWT_SECRET` and payload `{ sub, role: "admin", email }` (24h exp), compatible with
 *       `requireAdmin`. On success, sets the HttpOnly admin session cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ReferralAuthSignInRequest' }
 *     responses:
 *       200:
 *         description: Bearer access token for admin APIs.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ReferralAuthSignInSuccess' }
 *       400:
 *         description: Validation error.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Invalid email or password.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       503:
 *         description: Misconfiguration (e.g. `ADMIN_JWT_SECRET` missing).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  "/admin-signin-referral",
  validateRequest({ body: referralSignInBodySchema }),
  asyncHandler(postAdminSigninReferral)
);

export default router;
