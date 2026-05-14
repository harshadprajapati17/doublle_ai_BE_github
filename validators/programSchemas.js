import { z } from "zod";

export const programStatusSchema = z.enum(["DRAFT", "ACTIVE", "DISABLED"]);
export const attributionRuleSchema = z.enum([
  "FIRST_TOUCH",
  "FIRST_TOUCH_CODE_OVERRIDE",
  "LAST_TOUCH",
]);
export const capBehaviorSchema = z.enum(["ROLL_FORWARD", "HARD_STOP"]);

const currencySchema = z
  .string()
  .length(3)
  .transform((s) => s.toUpperCase());

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const listProgramsQuerySchema = z
  .object({
    status: programStatusSchema.optional(),
    q: z.string().trim().min(1).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().min(1).max(2048).optional(),
  })
  .strict();

export const createProgramSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    referrerRewardPct: z.coerce.number().min(0).max(100),
    referrerRewardDurationMonths: z.coerce.number().int().min(1).max(240),
    cookieDays: z.coerce.number().int().min(1).max(365),
    attributionRule: attributionRuleSchema,
    refereeBenefitValue: z.coerce.number().nonnegative().nullable(),
    holdPeriodDays: z.coerce.number().int().min(0).max(365),
    monthlyCap: z.coerce.number().nonnegative().nullable().optional(),
    lifetimeCap: z.coerce.number().nonnegative().nullable().optional(),
    capBehavior: capBehaviorSchema,
    currency: currencySchema.default("USD"),
    termsVersion: z.string().trim().min(1).max(64),
  })
  .strict();

export const updateProgramSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    referrerRewardPct: z.coerce.number().min(0).max(100).optional(),
    referrerRewardDurationMonths: z.coerce.number().int().min(1).max(240).optional(),
    cookieDays: z.coerce.number().int().min(1).max(365).optional(),
    attributionRule: attributionRuleSchema.optional(),
    refereeBenefitValue: z.coerce.number().nonnegative().nullable().optional(),
    holdPeriodDays: z.coerce.number().int().min(0).max(365).optional(),
    monthlyCap: z.coerce.number().nonnegative().nullable().optional(),
    lifetimeCap: z.coerce.number().nonnegative().nullable().optional(),
    capBehavior: capBehaviorSchema.optional(),
    currency: currencySchema.optional(),
    termsVersion: z.string().trim().min(1).max(64).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (Object.keys(val).length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field is required for update.",
        path: [],
      });
    }
  });

export const getProgramQuerySchema = z
  .object({
    include: z.enum(["versions"]).optional(),
  })
  .strict();

export const activateProgramQuerySchema = z
  .object({
    force: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((v) => v === true || v === "true"),
  })
  .strict();
