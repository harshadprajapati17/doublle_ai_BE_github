import { z } from "zod";

/** Same character set as generated codes (FR-2); length 6–16 for PRD-friendly codes. */
const REFERRAL_CODE_PATTERN = /^[A-HJKLMNP-Z2-9]{6,16}$/;

export const normalizedReferralCodeSchema = z
  .string()
  .trim()
  .transform((s) => s.toUpperCase())
  .pipe(z.string().regex(REFERRAL_CODE_PATTERN, "Invalid referral code format."));

const ATTRIBUTION_SOURCE_VALUES = ["LINK", "MANUAL_CODE", "COOKIE", "BOTH"];

/** Optional referral payload on demo signup (code required when object is present). */
export const referralSignupAttributionSchema = z
  .object({
    code: normalizedReferralCodeSchema,
    source: z.enum(ATTRIBUTION_SOURCE_VALUES).optional(),
    cookieData: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .strict();

/** Rejects unknown fields; treats missing or invalid JSON body as {}. */
export const referralEmptyBodySchema = z.preprocess(
  (raw) => (raw == null || typeof raw !== "object" || Array.isArray(raw) ? {} : raw),
  z.object({}).strict()
);

/**
 * Signup-time code validation: trim, uppercase, strict object, charset + length.
 */
export const referralValidateCodeBodySchema = z
  .object({
    code: normalizedReferralCodeSchema,
  })
  .strict();

/**
 * Authenticated attribution: bind the signed-in user (referee) to a referrer under the active program.
 */
export const referralAttributeBodySchema = z
  .object({
    code: normalizedReferralCodeSchema,
    source: z.enum(ATTRIBUTION_SOURCE_VALUES).optional(),
    cookieData: z.record(z.string(), z.unknown()).optional().nullable(),
    ip: z.string().trim().max(45).optional().nullable(),
    userAgent: z.string().max(2048).optional().nullable(),
  })
  .strict();

export const referralDashboardListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().min(1).max(2048).optional(),
  })
  .strict();
