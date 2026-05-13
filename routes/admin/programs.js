const { Router } = require("express");
const { requireAdmin } = require("../../middlewares/requireAdmin");
const { validateRequest } = require("../../middlewares/validateRequest");
const { asyncHandler } = require("../../middlewares/asyncHandler");
const {
  idParamSchema,
  listProgramsQuerySchema,
  createProgramSchema,
  updateProgramSchema,
  getProgramQuerySchema,
  activateProgramQuerySchema,
} = require("../../validators/programSchemas");
const {
  postProgram,
  getPrograms,
  getProgram,
  patchProgram,
  postActivateProgram,
  deleteProgram,
} = require("../../controllers/admin/programController");

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

module.exports = router;
