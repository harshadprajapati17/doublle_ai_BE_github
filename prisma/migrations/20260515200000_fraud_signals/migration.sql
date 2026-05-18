-- Fraud signals attached to referrals for review queue and scoring.

CREATE TABLE "fraud_signals" (
    "id" UUID NOT NULL,
    "referral_id" UUID NOT NULL,
    "type" VARCHAR(128) NOT NULL,
    "score" DECIMAL(6,4) NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_signals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fraud_signals_referral_id_idx" ON "fraud_signals"("referral_id");

CREATE INDEX "fraud_signals_created_at_idx" ON "fraud_signals"("created_at");

ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
