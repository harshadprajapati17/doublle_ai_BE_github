import { z } from "zod";

/** Demo login: allowlisted email; optional password when `DEMO_AUTH_PASSWORD` is set. */
export const demoLoginBodySchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email({ error: "Invalid email address." })),
    password: z.string().optional(),
  })
  .strict();
