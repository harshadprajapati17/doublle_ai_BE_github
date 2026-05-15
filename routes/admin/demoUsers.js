import { Router } from "express";
import { requireAdmin } from "../../middlewares/requireAdmin.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { idParamSchema } from "../../validators/programSchemas.js";
import {
  createDemoUserBodySchema,
  patchDemoUserBodySchema,
} from "../../validators/demoUserSchemas.js";
import {
  getDemoUsers,
  postDemoUser,
  getDemoUser,
  patchDemoUser,
  deleteDemoUserHandler,
} from "../../controllers/admin/demoUserController.js";

const router = Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/v1/admin/demo-users:
 *   get:
 *     tags: [Admin · Demo users]
 *     summary: List demo users (passwordless demo login allowlist)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Demo user rows (newest first, capped server-side).
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   post:
 *     tags: [Admin · Demo users]
 *     summary: Create a demo user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DemoUserCreate' }
 *     responses:
 *       201:
 *         description: Created
 *       409:
 *         description: Unique constraint (sub or email)
 * /api/v1/admin/demo-users/{id}:
 *   get:
 *     tags: [Admin · Demo users]
 *     summary: Get one demo user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Admin · Demo users]
 *     summary: Update a demo user
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
 *           schema: { $ref: '#/components/schemas/DemoUserPatch' }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 *       409: { description: Unique constraint }
 *   delete:
 *     tags: [Admin · Demo users]
 *     summary: Delete a demo user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found }
 */
router.get("/", asyncHandler(getDemoUsers));
router.post(
  "/",
  validateRequest({ body: createDemoUserBodySchema }),
  asyncHandler(postDemoUser)
);
router.get("/:id", validateRequest({ params: idParamSchema }), asyncHandler(getDemoUser));
router.patch(
  "/:id",
  validateRequest({ params: idParamSchema, body: patchDemoUserBodySchema }),
  asyncHandler(patchDemoUser)
);
router.delete(
  "/:id",
  validateRequest({ params: idParamSchema }),
  asyncHandler(deleteDemoUserHandler)
);

export default router;
