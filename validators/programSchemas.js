const { z } = require("zod");

const programStatusSchema = z.enum(["DRAFT", "ACTIVE", "DISABLED"]);
const attributionRuleSchema = z.enum([
  "FIRST_TOUCH",
  "FIRST_TOUCH_CODE_OVERRIDE",
  "LAST_TOUCH",
]);
const refereeBenefitTypeSchema = z.enum(["NONE", "TRIAL_EXTENSION", "CREDIT"]);
const capBehaviorSchema = z.enum(["ROLL_FORWARD", "HARD_STOP"]);

const currencySchema = z
  .string()
  .length(3)
  .transform((s) => s.toUpperCase());

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const listProgramsQuerySchema = z
  .object({
    status: programStatusSchema.optional(),
    q: z.string().trim().min(1).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().min(1).max(2048).optional(),
  })
  .strict();

const createProgramSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    rewardPct: z.coerce.number().min(0).max(100),
    rewardDurationMonths: z.coerce.number().int().min(1).max(240),
    cookieDays: z.coerce.number().int().min(1).max(365),
    attributionRule: attributionRuleSchema,
    refereeBenefitType: refereeBenefitTypeSchema,
    refereeBenefitValue: z.coerce.number().nonnegative().nullable().optional(),
    refereeBenefitTrialDays: z.coerce.number().int().min(0).max(365).nullable().optional(),
    holdPeriodDays: z.coerce.number().int().min(0).max(365),
    monthlyCap: z.coerce.number().nonnegative().nullable().optional(),
    lifetimeCap: z.coerce.number().nonnegative().nullable().optional(),
    capBehavior: capBehaviorSchema,
    refereeMinSpendAmount: z.coerce.number().nonnegative().nullable().optional(),
    refereeMinSpendWindowDays: z.coerce.number().int().min(0).max(3650).nullable().optional(),
    currency: currencySchema.default("USD"),
    termsVersion: z.string().trim().min(1).max(64),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.refereeBenefitType === "CREDIT" && val.refereeBenefitValue == null) {
      ctx.addIssue({
        code: "custom",
        message: "refereeBenefitValue is required when refereeBenefitType is CREDIT.",
        path: ["refereeBenefitValue"],
      });
    }
    if (val.refereeBenefitType === "TRIAL_EXTENSION" && val.refereeBenefitTrialDays == null) {
      ctx.addIssue({
        code: "custom",
        message: "refereeBenefitTrialDays is required when refereeBenefitType is TRIAL_EXTENSION.",
        path: ["refereeBenefitTrialDays"],
      });
    }
  });

const updateProgramSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    rewardPct: z.coerce.number().min(0).max(100).optional(),
    rewardDurationMonths: z.coerce.number().int().min(1).max(240).optional(),
    cookieDays: z.coerce.number().int().min(1).max(365).optional(),
    attributionRule: attributionRuleSchema.optional(),
    refereeBenefitType: refereeBenefitTypeSchema.optional(),
    refereeBenefitValue: z.coerce.number().nonnegative().nullable().optional(),
    refereeBenefitTrialDays: z.coerce.number().int().min(0).max(365).nullable().optional(),
    holdPeriodDays: z.coerce.number().int().min(0).max(365).optional(),
    monthlyCap: z.coerce.number().nonnegative().nullable().optional(),
    lifetimeCap: z.coerce.number().nonnegative().nullable().optional(),
    capBehavior: capBehaviorSchema.optional(),
    refereeMinSpendAmount: z.coerce.number().nonnegative().nullable().optional(),
    refereeMinSpendWindowDays: z.coerce.number().int().min(0).max(3650).nullable().optional(),
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

const getProgramQuerySchema = z
  .object({
    include: z.enum(["versions"]).optional(),
  })
  .strict();

const activateProgramQuerySchema = z
  .object({
    force: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((v) => v === true || v === "true"),
  })
  .strict();

module.exports = {
  programStatusSchema,
  attributionRuleSchema,
  refereeBenefitTypeSchema,
  capBehaviorSchema,
  idParamSchema,
  listProgramsQuerySchema,
  createProgramSchema,
  updateProgramSchema,
  getProgramQuerySchema,
  activateProgramQuerySchema,
};
