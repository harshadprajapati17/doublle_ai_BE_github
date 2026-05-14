-- Referral program terms acceptance (FR-3) and per-user referral codes.

CREATE TABLE "referral_terms_acceptances" (
    "id" UUID NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "program_id" UUID NOT NULL,
    "terms_version" VARCHAR(64) NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" VARCHAR(45) NOT NULL,

    CONSTRAINT "referral_terms_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referral_terms_acceptances_user_id_program_id_terms_version_key" ON "referral_terms_acceptances"("user_id", "program_id", "terms_version");

CREATE INDEX "referral_terms_acceptances_user_id_program_id_idx" ON "referral_terms_acceptances"("user_id", "program_id");

ALTER TABLE "referral_terms_acceptances" ADD CONSTRAINT "referral_terms_acceptances_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "referral_codes" (
    "id" UUID NOT NULL,
    "owner_user_id" VARCHAR(255) NOT NULL,
    "program_id" UUID NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

CREATE UNIQUE INDEX "referral_codes_owner_user_id_program_id_key" ON "referral_codes"("owner_user_id", "program_id");

CREATE INDEX "referral_codes_code_idx" ON "referral_codes"("code");

ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
