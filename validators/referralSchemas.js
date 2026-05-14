import { z } from "zod";

/** Same character set as generated codes (FR-2); length 6–16 for PRD-friendly codes. */
const REFERRAL_CODE_PATTERN = /^[A-HJKLMNP-Z2-9]{6,16}$/;

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
    code: z
      .string()
      .trim()
      .transform((s) => s.toUpperCase())
      .pipe(z.string().regex(REFERRAL_CODE_PATTERN, "Invalid referral code format.")),
  })
  .strict();
