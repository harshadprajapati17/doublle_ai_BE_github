import {
  applyEarnedCredit,
  transitionPendingToEarned,
} from "../services/commissionService.js";

/**
 * POST /api/v1/internal/commissions/transition-earned
 */
export async function postTransitionPendingToEarned(req, res) {
  const asOf =
    typeof req.body?.asOf === "string" ? new Date(req.body.asOf) : new Date();
  const result = await transitionPendingToEarned({ asOf });
  res.status(200).json({ data: result });
}

/**
 * POST /api/v1/internal/commissions/apply-credit
 */
export async function postApplyEarnedCredit(req, res) {
  const commissionId =
    typeof req.body?.commissionId === "string" ? req.body.commissionId : undefined;
  const limit =
    req.body?.limit != null ? Number(req.body.limit) : undefined;
  const result = await applyEarnedCredit({
    commissionId,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  res.status(200).json({ data: result });
}

/**
 * POST /api/v1/internal/commissions/run-lifecycle
 * Runs transition-earned then apply-credit (typical cron order).
 */
export async function postRunCommissionLifecycle(req, res) {
  const asOf =
    typeof req.body?.asOf === "string" ? new Date(req.body.asOf) : new Date();
  const earned = await transitionPendingToEarned({ asOf });
  const limit =
    req.body?.limit != null ? Number(req.body.limit) : undefined;
  const paid = await applyEarnedCredit({
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  res.status(200).json({ data: { earned, paid } });
}
