-- Extend referrals: status, attribution source enum, cookie/metadata, program version snapshot, termination.

CREATE TYPE "ReferralStatus" AS ENUM ('ACTIVE', 'TERMINATED', 'FRAUD_REJECTED');

CREATE TYPE "AttributionSource" AS ENUM ('LINK', 'MANUAL_CODE', 'COOKIE', 'BOTH');

ALTER TABLE "referrals" ADD COLUMN "status" "ReferralStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "referrals" ADD COLUMN "attribution_source" "AttributionSource";

UPDATE "referrals" SET "attribution_source" = 'LINK'::"AttributionSource" WHERE "attribution_source" IS NULL;

ALTER TABLE "referrals" ALTER COLUMN "attribution_source" SET NOT NULL;

ALTER TABLE "referrals" DROP COLUMN "source";

ALTER TABLE "referrals" ADD COLUMN "cookie_data" JSONB;

ALTER TABLE "referrals" ADD COLUMN "ip" VARCHAR(45);

ALTER TABLE "referrals" ADD COLUMN "user_agent" TEXT;

ALTER TABLE "referrals" ADD COLUMN "program_version_at_attribution" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "referrals" ADD COLUMN "terminated_at" TIMESTAMP(3);

ALTER TABLE "referrals" ADD COLUMN "termination_reason" TEXT;

CREATE INDEX "referrals_status_idx" ON "referrals"("status");

CREATE INDEX "referrals_created_at_idx" ON "referrals"("created_at");
