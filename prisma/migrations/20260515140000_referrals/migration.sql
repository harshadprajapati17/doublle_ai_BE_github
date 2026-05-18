-- Referral attributions: one row per referee per program; code/source snapshot; one-time referee credit flags.

CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referee_user_id" VARCHAR(255) NOT NULL,
    "referrer_user_id" VARCHAR(255) NOT NULL,
    "program_id" UUID NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "source" VARCHAR(64) NOT NULL,
    "referee_credit_applied" BOOLEAN NOT NULL DEFAULT false,
    "referee_credit_applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referrals_referee_user_id_program_id_key" ON "referrals"("referee_user_id", "program_id");

CREATE INDEX "referrals_referrer_user_id_program_id_idx" ON "referrals"("referrer_user_id", "program_id");

CREATE INDEX "referrals_program_id_idx" ON "referrals"("program_id");

CREATE INDEX "referrals_code_idx" ON "referrals"("code");

ALTER TABLE "referrals" ADD CONSTRAINT "referrals_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
