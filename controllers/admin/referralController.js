import {
  applyReferralDecision,
  getAdminReferralById,
  listAdminReferrals,
} from "../../services/adminReferralService.js";

export async function getAdminReferrals(req, res) {
  const result = await listAdminReferrals(req.query);
  res.status(200).json(result);
}

export async function getAdminReferral(req, res) {
  const result = await getAdminReferralById(req.params.id);
  res.status(200).json(result);
}

export async function postAdminReferralDecision(req, res) {
  const result = await applyReferralDecision(req.admin.id, req.params.id, req.body);
  res.status(200).json(result);
}
