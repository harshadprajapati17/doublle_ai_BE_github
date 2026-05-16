-- Referral commissions: accrual lifecycle linked to referral and optional subscription payment.

CREATE TYPE "CommissionState" AS ENUM ('PENDING', 'EARNED', 'PAID', 'CLAWED_BACK');

CREATE TABLE "commissions" (
    "id" UUID NOT NULL,
    "referral_id" UUID NOT NULL,
    "source_payment_id" UUID,
    "source_invoice_id" VARCHAR(64),
    "gross_amount" DECIMAL(12,2) NOT NULL,
    "net_amount" DECIMAL(12,2) NOT NULL,
    "reward_pct" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "state" "CommissionState" NOT NULL DEFAULT 'PENDING',
    "accrued_at" TIMESTAMP(3) NOT NULL,
    "payable_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "clawback_reason" TEXT,
    "reverses_commission_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "commissions_referral_id_idx" ON "commissions"("referral_id");

CREATE INDEX "commissions_state_idx" ON "commissions"("state");

CREATE INDEX "commissions_accrued_at_idx" ON "commissions"("accrued_at");

ALTER TABLE "commissions" ADD CONSTRAINT "commissions_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commissions" ADD CONSTRAINT "commissions_source_payment_id_fkey" FOREIGN KEY ("source_payment_id") REFERENCES "subscription_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "commissions" ADD CONSTRAINT "commissions_reverses_commission_id_fkey" FOREIGN KEY ("reverses_commission_id") REFERENCES "commissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
