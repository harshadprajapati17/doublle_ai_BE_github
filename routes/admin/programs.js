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

router.post(
  "/",
  validateRequest({ body: createProgramSchema }),
  asyncHandler(postProgram)
);

router.get(
  "/",
  validateRequest({ query: listProgramsQuerySchema }),
  asyncHandler(getPrograms)
);

router.get(
  "/:id",
  validateRequest({ params: idParamSchema, query: getProgramQuerySchema }),
  asyncHandler(getProgram)
);

router.patch(
  "/:id",
  validateRequest({ params: idParamSchema, body: updateProgramSchema }),
  asyncHandler(patchProgram)
);

router.post(
  "/:id/activate",
  validateRequest({ params: idParamSchema, query: activateProgramQuerySchema }),
  asyncHandler(postActivateProgram)
);

router.delete("/:id", validateRequest({ params: idParamSchema }), asyncHandler(deleteProgram));

export default router;
