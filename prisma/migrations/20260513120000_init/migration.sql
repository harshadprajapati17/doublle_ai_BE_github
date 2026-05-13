-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "AttributionRule" AS ENUM ('FIRST_TOUCH', 'FIRST_TOUCH_CODE_OVERRIDE', 'LAST_TOUCH');

-- CreateEnum
CREATE TYPE "RefereeBenefitType" AS ENUM ('NONE', 'TRIAL_EXTENSION', 'CREDIT');

-- CreateEnum
CREATE TYPE "CapBehavior" AS ENUM ('ROLL_FORWARD', 'HARD_STOP');

-- CreateTable
CREATE TABLE "programs" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "ProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "reward_pct" DECIMAL(5,2) NOT NULL,
    "reward_duration_months" INTEGER NOT NULL,
    "cookie_days" INTEGER NOT NULL,
    "attribution_rule" "AttributionRule" NOT NULL,
    "referee_benefit_type" "RefereeBenefitType" NOT NULL,
    "referee_benefit_value" DECIMAL(12,2),
    "referee_benefit_trial_days" INTEGER,
    "hold_period_days" INTEGER NOT NULL,
    "monthly_cap" DECIMAL(12,2),
    "lifetime_cap" DECIMAL(12,2),
    "cap_behavior" "CapBehavior" NOT NULL,
    "referee_min_spend_amount" DECIMAL(12,2),
    "referee_min_spend_window_days" INTEGER,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "terms_version" VARCHAR(64) NOT NULL,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_admin_id" VARCHAR(255),
    "disabled_at" TIMESTAMP(3),

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_versions" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "changed_by_admin_id" VARCHAR(255) NOT NULL,
    "change_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" VARCHAR(255) NOT NULL,
    "action" VARCHAR(128) NOT NULL,
    "target_type" VARCHAR(64) NOT NULL,
    "target_id" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "programs_status_idx" ON "programs"("status");

-- CreateIndex
CREATE INDEX "programs_name_idx" ON "programs"("name");

-- CreateIndex
CREATE INDEX "program_versions_program_id_idx" ON "program_versions"("program_id");

-- CreateIndex
CREATE UNIQUE INDEX "program_versions_program_id_version_key" ON "program_versions"("program_id", "version");

-- CreateIndex
CREATE INDEX "admin_audit_logs_target_type_target_id_idx" ON "admin_audit_logs"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "program_versions" ADD CONSTRAINT "program_versions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

