import { z } from "zod";

const billingFrequencySchema = z.enum([
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
]);

function parseAllowedCurrencies() {
  const raw = process.env.BILLING_ALLOWED_CURRENCIES ?? "INR,USD";
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length === 3);
}

/** Default cap: 124,200 major units (e.g. $124,200 when amount is in whole dollars). */
const DEFAULT_MAX_AMOUNT_MAJOR = 124_200;

function billingAmountBounds() {
  const min = Number(process.env.BILLING_MIN_AMOUNT_MAJOR ?? 1);
  const max = Number(process.env.BILLING_MAX_AMOUNT_MAJOR ?? DEFAULT_MAX_AMOUNT_MAJOR);
  return {
    min: Number.isFinite(min) && min >= 1 ? Math.floor(min) : 1,
    max: Number.isFinite(max) && max >= 1 ? Math.floor(max) : DEFAULT_MAX_AMOUNT_MAJOR,
  };
}

const allowedCurrencies = parseAllowedCurrencies();

export const createSubscriptionBodySchema = z
  .object({
    amount: z.coerce
      .number()
      .int()
      .positive()
      .superRefine((amount, ctx) => {
        const { min, max } = billingAmountBounds();
        if (amount < min || amount > max) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `amount must be between ${min} and ${max} (major units).`,
          });
        }
      }),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((s) => s.toUpperCase())
      .refine((c) => allowedCurrencies.includes(c), {
        message: `currency must be one of: ${allowedCurrencies.join(", ")}`,
      }),
    frequency: billingFrequencySchema,
  })
  .strict();

export const cancelSubscriptionBodySchema = z
  .object({
    cancelAtCycleEnd: z.boolean(),
  })
  .strict();
