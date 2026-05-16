import {
  userAccessTokenCookieName,
  userAccessTokenCookieOptions,
} from "../config/userAccessTokenCookie.js";
import {
  adminAccessTokenCookieName,
  adminAccessTokenCookieOptions,
} from "../config/adminAccessTokenCookie.js";
import {
  issueDemoUserAccessToken,
  issueDemoAdminAccessToken,
} from "../services/demoAuthService.js";

export async function postDemoLogin(req, res) {
  const { email, password } = req.body;
  const data = await issueDemoUserAccessToken(email, password);
  res.cookie(
    userAccessTokenCookieName(),
    data.accessToken,
    userAccessTokenCookieOptions(data.expiresInSeconds)
  );
  res.status(200).json({ data });
}

export async function postDemoAdminLogin(req, res) {
  const { email, password } = req.body;
  const data = await issueDemoAdminAccessToken(email, password);
  res.cookie(
    adminAccessTokenCookieName(),
    data.accessToken,
    adminAccessTokenCookieOptions(data.expiresInSeconds)
  );
  res.status(200).json({ data });
}
