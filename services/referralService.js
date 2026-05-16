import { randomBytes } from "node:crypto";
import { prisma } from "../data/prismaClient.js";
import * as programRepo from "../data/programRepo.js";
import * as referralTermsAcceptanceRepo from "../data/referralTermsAcceptanceRepo.js";
import * as referralCodeRepo from "../data/referralCodeRepo.js";
import * as referralRepo from "../data/referralRepo.js";
import {
  NoActiveReferralProgramError,
  NotFoundError,
  ReferralAlreadyAttributedError,
  SelfReferralError,
  ServiceMisconfiguredError,
} from "../errors/index.js";
import { refereeBenefitFromProgram } from "./programSerializer.js";
import { referralToDto } from "./referralSerializer.js";
import { getReferrerDashboardSummary } from "./referralDashboardService.js";
import { evaluateFraudSignalsOnAttribution } from "./fraudSignalService.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const MAX_CODE_ATTEMPTS = 12;

/**
 * @returns {string} Normalized absolute base URL (no trailing slash) for building ?ref= links.
 */
function resolveReferralPublicBaseUrl() {
  const raw = process.env.REFERRAL_PUBLIC_BASE_URL;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) {
    throw new ServiceMisconfiguredError(
      "REFERRAL_PUBLIC_BASE_URL is not set. Configure the public app base URL used for referral links."
    );
  }
  const base = trimmed.replace(/\/$/, "");
  let url;
  try {
    url = new URL(base);
  } catch {
    throw new ServiceMisconfiguredError(
      "REFERRAL_PUBLIC_BASE_URL is not a valid absolute URL (must include a scheme, e.g. http or https)."
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ServiceMisconfiguredError(
      "REFERRAL_PUBLIC_BASE_URL must use http or https."
    );
  }
  return base;
}

/**
 * @param {string} code
 * @param {string} base
 */
function buildReferralUrl(code, base) {
  const url = new URL(base);
  url.searchParams.set("ref", code);
  return url.toString();
}

function randomReferralCode() {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

/**
 * @param {{ programId: string; code: string; createdAt: Date }} row
 * @param {{ id: string; termsVersion: string }} program
 * @param {string} publicBase
 */
function dtoFromCode(row, program, publicBase) {
  return {
    programId: row.programId,
    code: row.code,
    referralUrl: buildReferralUrl(row.code, publicBase),
    termsVersion: program.termsVersion,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Idempotent referral code + URL for the user under the program.
 * @param {string} userId
 * @param {{ id: string; termsVersion: string }} program
 * @param {string} publicBase
 */
async function allocateReferralCodeDto(userId, program, publicBase) {
  const existing = await referralCodeRepo.findByOwnerAndProgram(prisma, userId, program.id);
  if (existing) {
    return dtoFromCode(existing, program, publicBase);
  }

  /** @type {unknown} */
  let lastErr;
  for (let a = 0; a < MAX_CODE_ATTEMPTS; a++) {
    const code = randomReferralCode();
    try {
      const created = await referralCodeRepo.create(prisma, {
        ownerUserId: userId,
        programId: program.id,
        code,
      });
      return dtoFromCode(created, program, publicBase);
    } catch (e) {
      lastErr = e;
      if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Could not allocate referral code.");
}

/**
 * Records terms acceptance for the active program and returns link/code in one step (FR-3 + lazy code).
 * `idempotent` refers only to whether terms were already accepted for this program version.
 * @param {string} userId
 * @param {string} ip
 */
export async function acceptReferralTermsAndGenerateLink(userId, ip) {
  const publicBase = resolveReferralPublicBaseUrl();
  const program = await programRepo.findFirstActive(prisma);
  if (!program) {
    throw new NoActiveReferralProgramError();
  }

  const existingAcceptance = await referralTermsAcceptanceRepo.findForUserProgramTerms(
    prisma,
    userId,
    program.id,
    program.termsVersion
  );
  let acceptedAt;
  let idempotent;
  if (existingAcceptance) {
    acceptedAt = existingAcceptance.acceptedAt;
    idempotent = true;
  } else {
    const created = await referralTermsAcceptanceRepo.create(prisma, {
      userId,
      programId: program.id,
      termsVersion: program.termsVersion,
      ip,
    });
    acceptedAt = created.acceptedAt;
    idempotent = false;
  }

  const linkDto = await allocateReferralCodeDto(userId, program, publicBase);
  return {
    data: {
      programId: program.id,
      termsVersion: program.termsVersion,
      acceptedAt: acceptedAt.toISOString(),
      idempotent,
      code: linkDto.code,
      referralUrl: linkDto.referralUrl,
      createdAt: linkDto.createdAt,
    },
  };
}

/**
 * Returns the caller's referral code and share URL for the active program (read-only).
 * @param {string} userId
 */
export async function getMyReferralCodeAndLink(userId) {
  const publicBase = resolveReferralPublicBaseUrl();
  const program = await programRepo.findFirstActive(prisma);
  if (!program) {
    throw new NoActiveReferralProgramError();
  }

  const row = await referralCodeRepo.findByOwnerAndProgram(prisma, userId, program.id);
  if (!row) {
    throw new NotFoundError(
      "No referral code yet. Accept the active referral program terms to obtain your link and code."
    );
  }

  const summary = await getReferrerDashboardSummary(userId, program.id, program.currency);

  return {
    data: {
      programId: program.id,
      termsVersion: program.termsVersion,
      code: row.code,
      referralUrl: buildReferralUrl(row.code, publicBase),
      createdAt: row.createdAt.toISOString(),
      summary,
    },
  };
}

/**
 * Public signup-time check (PRD §13.1). Invalid or unknown codes return `{ valid: false }` with 200.
 * @param {string} normalizedCode Uppercase code from validated request body.
 */
export async function validateReferralCodeForSignup(normalizedCode) {
  const program = await programRepo.findFirstActive(prisma);
  if (!program) {
    return { data: { valid: false } };
  }

  const row = await referralCodeRepo.findByCode(prisma, normalizedCode);
  if (!row || row.programId !== program.id) {
    return { data: { valid: false } };
  }

  return {
    data: {
      valid: true,
      programId: program.id,
      code: row.code,
      refereeBenefit: refereeBenefitFromProgram(program),
    },
  };
}

/**
 * Bind a referee to a referrer under the active program (signup / internal attribution).
 * @param {{
 *   refereeUserId: string;
 *   code: string;
 *   source?: import('../generated/prisma/client').AttributionSource;
 *   cookieData?: Record<string, unknown> | null;
 *   ip?: string | null;
 *   userAgent?: string | null;
 * }} input Normalized body from validated request.
 */
export async function attributeReferral(input) {
  const program = await programRepo.findFirstActive(prisma);
  if (!program) {
    throw new NoActiveReferralProgramError();
  }

  const referralCode = await referralCodeRepo.findByCode(prisma, input.code);
  if (!referralCode || referralCode.programId !== program.id) {
    throw new NotFoundError("Referral code not found.");
  }

  if (referralCode.ownerUserId === input.refereeUserId) {
    throw new SelfReferralError();
  }

  const existing = await referralRepo.findByRefereeAndProgram(
    prisma,
    input.refereeUserId,
    program.id
  );
  if (existing) {
    throw new ReferralAlreadyAttributedError();
  }

  const attributionSource = input.source ?? "LINK";

  const created = await referralRepo.create(prisma, {
    refereeUserId: input.refereeUserId,
    referrerUserId: referralCode.ownerUserId,
    program: { connect: { id: program.id } },
    code: referralCode.code,
    status: "ACTIVE",
    attributionSource,
    cookieData: input.cookieData ?? undefined,
    ip: input.ip ?? undefined,
    userAgent: input.userAgent ?? undefined,
    programVersionAtAttribution: program.currentVersion,
  });

  await evaluateFraudSignalsOnAttribution({
    referralId: created.id,
    referrerUserId: referralCode.ownerUserId,
    programId: program.id,
    refereeIp: input.ip ?? null,
  });

  return { data: referralToDto(created) };
}
