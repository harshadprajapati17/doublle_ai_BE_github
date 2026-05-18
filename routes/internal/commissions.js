import { Router } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { requireInternalCron } from "../../middlewares/requireInternalCron.js";
import {
  postApplyEarnedCredit,
  postRunCommissionLifecycle,
  postTransitionPendingToEarned,
} from "../../controllers/internalCommissionsController.js";

const router = Router();

router.use(requireInternalCron);

router.post("/transition-earned", asyncHandler(postTransitionPendingToEarned));
router.post("/apply-credit", asyncHandler(postApplyEarnedCredit));
router.post("/run-lifecycle", asyncHandler(postRunCommissionLifecycle));

export default router;
