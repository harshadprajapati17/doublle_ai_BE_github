import { Router } from "express";
import { validateRequest } from "../middlewares/validateRequest.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { demoLoginBodySchema } from "../validators/demoAuthSchemas.js";
import { postDemoLogin } from "../controllers/demoAuthController.js";

const router = Router();

/**
 * @openapi
 * /api/v1/auth/demo:
 *   post:
 *     tags: [Auth · Demo]
 *     summary: Demo user JWT (allowlisted emails; optional shared password)
 *     description: >
 *       Available only when `DEMO_AUTH_ENABLED=true` and `NODE_ENV` is not `production`,
 *       unless `DEMO_AUTH_ALLOW_PRODUCTION=true`. Mints an HS256 JWT with `USER_JWT_SECRET`
 *       and payload `{ sub, role: "user", email }` (24h exp), compatible with `requireUser`.
 *       Allowlist is the `demo_users` table (`is_enabled=true`); manage rows via admin APIs or SQL.
 *       Unknown or non-allowlisted emails respond with 401. When `DEMO_AUTH_PASSWORD` is set,
 *       the request body must include a matching `password`; otherwise `password` is optional.
 *       On success, also sets an HttpOnly session cookie (default name `doublle_access_token`) with the same JWT;
 *       `requireUser` accepts either that cookie or `Authorization: Bearer` for subsequent requests.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DemoAuthLoginRequest' }
 *     responses:
 *       200:
 *         description: Bearer access token for dashboard user APIs.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/DemoAuthLoginSuccess' }
 *       400:
 *         description: Validation error (e.g. unknown JSON fields or invalid email format).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Email is not on the demo allowlist.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       503:
 *         description: Misconfiguration (e.g. `USER_JWT_SECRET` missing).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post("/", validateRequest({ body: demoLoginBodySchema }), asyncHandler(postDemoLogin));

export default router;
