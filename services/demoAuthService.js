import jwt from "jsonwebtoken";
import { prisma } from "../data/prismaClient.js";
import * as demoUserRepo from "../data/demoUserRepo.js";
import { ServiceMisconfiguredError, UnauthorizedError } from "../errors/index.js";

const JWT_EXPIRES_IN = "24h";
const JWT_EXPIRES_IN_SECONDS = 24 * 60 * 60;

/**
 * Issues an HS256 user JWT (same contract as requireUser) for an enabled demo user row.
 * @param {string} normalizedEmail lowercased, trimmed
 * @returns {Promise<{ accessToken: string; tokenType: string; expiresInSeconds: number }>}
 */
export async function issueDemoUserAccessToken(normalizedEmail) {
  const account = await demoUserRepo.findFirstEnabledByEmail(prisma, normalizedEmail);
  if (!account) {
    throw new UnauthorizedError("Demo sign-in is not allowed for this email.");
  }

  const secret = process.env.USER_JWT_SECRET;
  if (!secret || secret.trim() === "") {
    throw new ServiceMisconfiguredError("USER_JWT_SECRET is not configured.");
  }

  const accessToken = jwt.sign(
    { sub: account.sub, role: "user", email: account.email },
    secret,
    { algorithm: "HS256", expiresIn: JWT_EXPIRES_IN }
  );

  return {
    accessToken,
    tokenType: "Bearer",
    expiresInSeconds: JWT_EXPIRES_IN_SECONDS,
  };
}
