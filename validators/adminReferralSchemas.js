import { z } from "zod";

export const referralStatusSchema = z.enum(["ACTIVE", "TERMINATED", "FRAUD_REJECTED"]);

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const listAdminReferralsQuerySchema = z
  .object({
    referrerUserId: z.string().trim().min(1).max(255).optional(),
    refereeUserId: z.string().trim().min(1).max(255).optional(),
    code: z.string().trim().min(1).max(16).optional(),
    status: referralStatusSchema.optional(),
    programId: z.string().uuid().optional(),
    createdFrom: z.string().datetime().optional(),
    createdTo: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().min(1).max(2048).optional(),
  })
  .strict();

export const referralDecisionBodySchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT", "TERMINATE"]),
    note: z.string().trim().min(1).max(2000),
  })
  .strict();
