import { z } from "zod";

/** Passwordless demo login: allowlisted email only (no password field). */
export const demoLoginBodySchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email({ error: "Invalid email address." })),
  })
  .strict();
