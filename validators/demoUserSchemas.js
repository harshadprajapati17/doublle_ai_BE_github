import { z } from "zod";

const emailNormalized = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Invalid email address." }));

export const createDemoUserBodySchema = z
  .object({
    sub: z.string().trim().min(1).max(256),
    email: emailNormalized,
    name: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

export const patchDemoUserBodySchema = z
  .object({
    sub: z.string().trim().min(1).max(256).optional(),
    email: emailNormalized.optional(),
    name: z.union([z.string().trim().min(1).max(200), z.null()]).optional(),
    isEnabled: z.boolean().optional(),
  })
  .strict()
  .refine(
    (o) =>
      o.sub !== undefined ||
      o.email !== undefined ||
      o.name !== undefined ||
      o.isEnabled !== undefined,
    { message: "At least one field is required." }
  );
