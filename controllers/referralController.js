import {
  acceptReferralTermsAndGenerateLink,
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

export async function postValidateReferralCode(req, res) {
  const result = await validateReferralCodeForSignup(req.body.code);
  res.status(200).json(result);
}
