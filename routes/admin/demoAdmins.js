import { Router } from "express";
import { requireAdmin } from "../../middlewares/requireAdmin.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { idParamSchema } from "../../validators/programSchemas.js";
import {
  createDemoAdminBodySchema,
  patchDemoAdminBodySchema,
} from "../../validators/demoAdminSchemas.js";
import {
  getDemoAdmins,
  postDemoAdmin,
  getDemoAdmin,
  patchDemoAdmin,
  deleteDemoAdminHandler,
} from "../../controllers/admin/demoAdminController.js";

const router = Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/v1/admin/demo-admins:
 *   get:
 *     tags: [Admin · Demo admins]
 *     summary: List demo admins (passwordless demo admin login allowlist)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Demo admin rows (newest first, capped server-side).
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   post:
 *     tags: [Admin · Demo admins]
 *     summary: Create a demo admin
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DemoAdminCreate' }
 *     responses:
 *       201:
 *         description: Created
 *       409:
 *         description: Unique constraint (sub or email)
 * /api/v1/admin/demo-admins/{id}:
 *   get:
 *     tags: [Admin · Demo admins]
 *     summary: Get one demo admin
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
 *     tags: [Admin · Demo admins]
 *     summary: Update a demo admin
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
 *           schema: { $ref: '#/components/schemas/DemoAdminPatch' }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 *       409: { description: Unique constraint }
 *   delete:
 *     tags: [Admin · Demo admins]
 *     summary: Delete a demo admin
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
router.get("/", asyncHandler(getDemoAdmins));
router.post(
  "/",
  validateRequest({ body: createDemoAdminBodySchema }),
  asyncHandler(postDemoAdmin)
);
router.get("/:id", validateRequest({ params: idParamSchema }), asyncHandler(getDemoAdmin));
router.patch(
  "/:id",
  validateRequest({ params: idParamSchema, body: patchDemoAdminBodySchema }),
  asyncHandler(patchDemoAdmin)
);
router.delete(
  "/:id",
  validateRequest({ params: idParamSchema }),
  asyncHandler(deleteDemoAdminHandler)
);

export default router;
