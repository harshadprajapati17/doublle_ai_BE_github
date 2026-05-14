import { Router } from "express";
import { requireAdmin } from "../../middlewares/requireAdmin.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import {
  idParamSchema,
  listProgramsQuerySchema,
  createProgramSchema,
  updateProgramSchema,
  getProgramQuerySchema,
  activateProgramQuerySchema,
} from "../../validators/programSchemas.js";
import {
  postProgram,
  getPrograms,
  getProgram,
  patchProgram,
  postActivateProgram,
  deleteProgram,
} from "../../controllers/admin/programController.js";

const router = Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/v1/admin/programs:
 *   post:
 *     tags: [Admin · Programs]
 *     summary: Create a new program
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProgramCreate' }
 *     responses:
 *       201:
 *         description: Program created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Program' }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post(
  "/",
  validateRequest({ body: createProgramSchema }),
  asyncHandler(postProgram)
);

/**
 * @openapi
 * /api/v1/admin/programs:
 *   get:
 *     tags: [Admin · Programs]
 *     summary: List programs (cursor-paginated)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { $ref: '#/components/schemas/ProgramStatus' }
 *       - in: query
 *         name: q
 *         description: Free-text search.
 *         schema: { type: string, minLength: 1, maxLength: 200 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Program' }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     nextCursor: { type: string, nullable: true }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get(
  "/",
  validateRequest({ query: listProgramsQuerySchema }),
  asyncHandler(getPrograms)
);

/**
 * @openapi
 * /api/v1/admin/programs/{id}:
 *   get:
 *     tags: [Admin · Programs]
 *     summary: Get a program by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: include
 *         schema: { type: string, enum: [versions] }
 *     responses:
 *       200:
 *         description: Program found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Program' }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get(
  "/:id",
  validateRequest({ params: idParamSchema, query: getProgramQuerySchema }),
  asyncHandler(getProgram)
);

/**
 * @openapi
 * /api/v1/admin/programs/{id}:
 *   patch:
 *     tags: [Admin · Programs]
 *     summary: Update a program
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
 *           schema: { $ref: '#/components/schemas/ProgramUpdate' }
 *     responses:
 *       200:
 *         description: Program updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Program' }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: Conflict, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.patch(
  "/:id",
  validateRequest({ params: idParamSchema, body: updateProgramSchema }),
  asyncHandler(patchProgram)
);

/**
 * @openapi
 * /api/v1/admin/programs/{id}/activate:
 *   post:
 *     tags: [Admin · Programs]
 *     summary: Activate a program
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: force
 *         description: Force activation even if another program is already active.
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Program activated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Program' }
 *                 meta: { type: object }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: Conflict, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post(
  "/:id/activate",
  validateRequest({ params: idParamSchema, query: activateProgramQuerySchema }),
  asyncHandler(postActivateProgram)
);

/**
 * @openapi
 * /api/v1/admin/programs/{id}:
 *   delete:
 *     tags: [Admin · Programs]
 *     summary: Disable (soft-delete) a program
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Disabled (no content) }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthenticated, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: Forbidden, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Not found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.delete("/:id", validateRequest({ params: idParamSchema }), asyncHandler(deleteProgram));

export default router;
