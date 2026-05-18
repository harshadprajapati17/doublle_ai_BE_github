import {
  userAccessTokenCookieName,
  userAccessTokenCookieOptions,
} from "../config/userAccessTokenCookie.js";
import {
  adminAccessTokenCookieName,
  adminAccessTokenCookieOptions,
} from "../config/adminAccessTokenCookie.js";
import {
  registerReferralUser,
  registerReferralAdmin,
  signInReferralUser,
  signInReferralAdmin,
} from "../services/referralAuthService.js";

/**
 * @param {import("express").Request} req
 * @returns {string | null}
 */
function clientIpFromRequest(req) {
  const forwarded = req.get("x-forwarded-for");
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  if (typeof req.ip === "string" && req.ip) {
    return req.ip;
  }
  return null;
}

export async function postSignupReferral(req, res) {
  const { email, name, password, referral } = req.body;
  const result = await registerReferralUser({
    email,
    name,
    password,
    referral,
    ip: clientIpFromRequest(req),
    userAgent: typeof req.get("user-agent") === "string" ? req.get("user-agent") : null,
  });
  res.cookie(
    userAccessTokenCookieName(),
    result.data.accessToken,
    userAccessTokenCookieOptions(result.data.expiresInSeconds)
  );
  res.status(201).json(result);
}

export async function postSigninReferral(req, res) {
  const { email, password } = req.body;
  const data = await signInReferralUser(email, password);
  res.cookie(
    userAccessTokenCookieName(),
    data.accessToken,
    userAccessTokenCookieOptions(data.expiresInSeconds)
  );
  res.status(200).json({ data });
}

export async function postAdminSignupReferral(req, res) {
  const { email, name, password } = req.body;
  const result = await registerReferralAdmin({ email, name, password });
  res.cookie(
    adminAccessTokenCookieName(),
    result.data.accessToken,
    adminAccessTokenCookieOptions(result.data.expiresInSeconds)
  );
  res.status(201).json(result);
}

export async function postAdminSigninReferral(req, res) {
  const { email, password } = req.body;
  const data = await signInReferralAdmin(email, password);
  res.cookie(
    adminAccessTokenCookieName(),
    data.accessToken,
    adminAccessTokenCookieOptions(data.expiresInSeconds)
  );
  res.status(200).json({ data });
}
