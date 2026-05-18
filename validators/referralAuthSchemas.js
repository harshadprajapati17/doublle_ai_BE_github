import { z } from "zod";
import { referralSignupAttributionSchema } from "./referralSchemas.js";

const emailNormalized = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Invalid email address." }));

const passwordField = z.string().min(8, "Password must be at least 8 characters.").max(128);

/** User or admin sign-in. */
export const referralSignInBodySchema = z
  .object({
    email: emailNormalized,
    password: passwordField,
  })
  .strict();

/** User sign-up with optional referral attribution. */
export const referralUserSignupBodySchema = z
  .object({
    email: emailNormalized,
    password: passwordField,
    name: z.string().trim().min(1).max(200).optional(),
    referral: referralSignupAttributionSchema.optional(),
  })
  .strict();

/** Admin sign-up. */
export const referralAdminSignupBodySchema = z
  .object({
    email: emailNormalized,
    password: passwordField,
    name: z.string().trim().min(1).max(200).optional(),
  })
  .strict();
