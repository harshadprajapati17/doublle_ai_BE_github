import {
  userAccessTokenCookieName,
  userAccessTokenCookieOptions,
} from "../config/userAccessTokenCookie.js";
import { issueDemoUserAccessToken } from "../services/demoAuthService.js";

export async function postDemoLogin(req, res) {
  const { email } = req.body;
  const data = await issueDemoUserAccessToken(email);
  res.cookie(
    userAccessTokenCookieName(),
    data.accessToken,
    userAccessTokenCookieOptions(data.expiresInSeconds)
  );
  res.status(200).json({ data });
}
