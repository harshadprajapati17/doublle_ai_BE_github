import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../data/prismaClient.js";
import * as demoUserRepo from "../data/demoUserRepo.js";
import * as demoAdminRepo from "../data/demoAdminRepo.js";
import {
  ConflictError,
  NoActiveReferralProgramError,
  NotFoundError,
  ReferralAlreadyAttributedError,
  SelfReferralError,
  ServiceMisconfiguredError,
  UnauthorizedError,
} from "../errors/index.js";
import { attributeReferral } from "./referralService.js";

const JWT_EXPIRES_IN = "24h";
const JWT_EXPIRES_IN_SECONDS = 24 * 60 * 60;

const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

function isPrismaUniqueViolation(err) {
  return err && typeof err === "object" && "code" in err && err.code === "P2002";
}

/**
 * @param {string} stored
 * @param {string} provided
 */
function passwordMatches(stored, provided) {
  // TODO(prod): verify with hash compare instead of string equality.
  return stored === provided;
}

/**
 * @param {string} plain
 * @returns {string}
 */
function passwordForStorage(plain) {
  // TODO(prod): hash password (bcrypt/argon2) before persist; never store plaintext.
  return plain;
}

/**
 * @param {{ sub: string; email: string }} account
 * @returns {{ accessToken: string; tokenType: string; expiresInSeconds: number }}
 */
export function signUserAccessToken(account) {
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

/**
 * @param {{ sub: string; email: string }} account
 * @returns {{ accessToken: string; tokenType: string; expiresInSeconds: number }}
 */
export function signAdminAccessToken(account) {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.trim() === "") {
    throw new ServiceMisconfiguredError("ADMIN_JWT_SECRET is not configured.");
  }

  const accessToken = jwt.sign(
    { sub: account.sub, role: "admin", email: account.email },
    secret,
    { algorithm: "HS256", expiresIn: JWT_EXPIRES_IN }
  );

  return {
    accessToken,
    tokenType: "Bearer",
    expiresInSeconds: JWT_EXPIRES_IN_SECONDS,
  };
}

/**
 * @param {{
 *   referral?: { code: string; source?: string; cookieData?: Record<string, unknown> | null };
 *   refereeUserId: string;
 *   ip?: string | null;
 *   userAgent?: string | null;
 * }} input
 */
async function tryAttributeReferralOnSignup(input) {
  if (!input.referral?.code) {
    return { attributed: false, skipped: true };
  }

  try {
    const result = await attributeReferral({
      refereeUserId: input.refereeUserId,
      code: input.referral.code,
      source: input.referral.source,
      cookieData: input.referral.cookieData,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });
    return { attributed: true, referral: result.data };
  } catch (err) {
    if (err instanceof NotFoundError) {
      return { attributed: false, reason: "CODE_NOT_FOUND" };
    }
    if (err instanceof NoActiveReferralProgramError) {
      return { attributed: false, reason: "NO_ACTIVE_PROGRAM" };
    }
    if (err instanceof SelfReferralError) {
      return { attributed: false, reason: "SELF_REFERRAL" };
    }
    if (err instanceof ReferralAlreadyAttributedError) {
      return { attributed: false, reason: "ALREADY_ATTRIBUTED" };
    }
    throw err;
  }
}

/**
 * @param {{
 *   email: string;
 *   password: string;
 *   name?: string;
 *   referral?: { code: string; source?: string; cookieData?: Record<string, unknown> | null };
 *   ip?: string | null;
 *   userAgent?: string | null;
 * }} input
 */
export async function registerReferralUser(input) {
  const sub = `demo-${randomUUID()}`;

  let row;
  try {
    row = await demoUserRepo.create(prisma, {
      sub,
      email: input.email,
      password: passwordForStorage(input.password),
      ...(input.name !== undefined ? { name: input.name } : {}),
    });
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      throw new ConflictError(
        "An account with this email already exists. Sign in instead."
      );
    }
    throw err;
  }

  const token = signUserAccessToken(row);
  const referral = await tryAttributeReferralOnSignup({
    refereeUserId: row.sub,
    referral: input.referral,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return {
    data: {
      ...token,
      user: {
        id: row.id,
        sub: row.sub,
        email: row.email,
        name: row.name,
      },
      referral,
    },
  };
}

/**
 * @param {string} normalizedEmail
 * @param {string} password
 */
export async function signInReferralUser(normalizedEmail, password) {
  const account = await demoUserRepo.findFirstEnabledByEmail(prisma, normalizedEmail);
  if (!account || !passwordMatches(account.password, password)) {
    throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  return signUserAccessToken(account);
}

/**
 * @param {{
 *   email: string;
 *   password: string;
 *   name?: string;
 * }} input
 */
export async function registerReferralAdmin(input) {
  const sub = `demo-admin-${randomUUID()}`;

  let row;
  try {
    row = await demoAdminRepo.create(prisma, {
      sub,
      email: input.email,
      password: passwordForStorage(input.password),
      ...(input.name !== undefined ? { name: input.name } : {}),
    });
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      throw new ConflictError(
        "An account with this email already exists. Sign in instead."
      );
    }
    throw err;
  }

  const token = signAdminAccessToken(row);

  return {
    data: {
      ...token,
      admin: {
        id: row.id,
        sub: row.sub,
        email: row.email,
        name: row.name,
      },
    },
  };
}

/**
 * @param {string} normalizedEmail
 * @param {string} password
 */
export async function signInReferralAdmin(normalizedEmail, password) {
  const account = await demoAdminRepo.findFirstEnabledByEmail(prisma, normalizedEmail);
  if (!account || !passwordMatches(account.password, password)) {
    throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  return signAdminAccessToken(account);
}
