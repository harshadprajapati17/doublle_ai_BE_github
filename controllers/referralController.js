import { getActiveProgramForUser } from "../services/programService.js";
import {
  listReferrerReferees,
  listReferrerTransactions,
} from "../services/referralDashboardService.js";
import {
  acceptReferralTermsAndGenerateLink,
  attributeReferral,
  getMyReferralCodeAndLink,
  validateReferralCodeForSignup,
} from "../services/referralService.js";
import { getClientIp } from "../utils/clientIp.js";

export async function postAcceptReferralTerms(req, res) {
  const ip = getClientIp(req);
  const result = await acceptReferralTermsAndGenerateLink(req.user.id, ip);
  const status = result.data.idempotent ? 200 : 201;
  res.status(status).json(result);
}

export async function getReferralMe(req, res) {
  const result = await getMyReferralCodeAndLink(req.user.id);
  res.status(200).json(result);
}

export async function getReferralMeReferees(req, res) {
  const result = await listReferrerReferees(req.user.id, req.query);
  res.status(200).json(result);
}

export async function getReferralMeTransactions(req, res) {
  const result = await listReferrerTransactions(req.user.id, req.query);
  res.status(200).json(result);
}

export async function getActiveReferralProgram(req, res) {
  const result = await getActiveProgramForUser();
  res.status(200).json(result);
}

export async function postValidateReferralCode(req, res) {
  const result = await validateReferralCodeForSignup(req.body.code);
  res.status(200).json(result);
}

export async function postAttributeReferral(req, res) {
  const result = await attributeReferral({
    refereeUserId: req.user.id,
    code: req.body.code,
    source: req.body.source,
    cookieData: req.body.cookieData,
    ip: req.body.ip,
    userAgent: req.body.userAgent,
  });
  res.status(201).json(result);
}
