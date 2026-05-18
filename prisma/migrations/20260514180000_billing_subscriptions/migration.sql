-- CreateEnum
CREATE TYPE "BillingFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM (
  'CREATED',
  'AUTHENTICATED',
  'ACTIVE',
  'PENDING',
  'HALTED',
  'PAUSED',
  'CANCELLED',
  'COMPLETED',
  'EXPIRED'
);

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM (
  'CREATED',
  'AUTHORIZED',
  'CAPTURED',
  'FAILED',
  'REFUNDED'
);

-- CreateTable
CREATE TABLE "billing_customers" (
  "id" UUID NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "rzp_customer_id" VARCHAR(64) NOT NULL,
  "email" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_plans" (
  "id" UUID NOT NULL,
  "rzp_plan_id" VARCHAR(64) NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "frequency" "BillingFrequency" NOT NULL,
  "period" VARCHAR(16) NOT NULL,
  "interval" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "billing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
  "id" UUID NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "customer_id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "rzp_subscription_id" VARCHAR(64) NOT NULL,
  "status" "SubscriptionStatus" NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "frequency" "BillingFrequency" NOT NULL,
  "total_count" INTEGER NOT NULL,
  "paid_count" INTEGER NOT NULL DEFAULT 0,
  "current_start" TIMESTAMP(3),
  "current_end" TIMESTAMP(3),
  "next_charge_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "cancel_at_cycle_end" BOOLEAN NOT NULL DEFAULT false,
  "short_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
  "id" UUID NOT NULL,
  "subscription_id" UUID NOT NULL,
  "rzp_payment_id" VARCHAR(64) NOT NULL,
  "rzp_order_id" VARCHAR(64),
  "rzp_invoice_id" VARCHAR(64),
  "amount_minor" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "status" "SubscriptionPaymentStatus" NOT NULL,
  "method" VARCHAR(32),
  "error_code" VARCHAR(128),
  "error_description" TEXT,
  "captured_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
  "id" UUID NOT NULL,
  "provider" VARCHAR(32) NOT NULL,
  "event_id" VARCHAR(64) NOT NULL,
  "event_type" VARCHAR(96) NOT NULL,
  "payload" JSONB NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "processing_error" TEXT,

  CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_user_id_key" ON "billing_customers" ("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_rzp_customer_id_key" ON "billing_customers" ("rzp_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_plans_rzp_plan_id_key" ON "billing_plans" ("rzp_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_plans_amount_minor_currency_frequency_key" ON "billing_plans" ("amount_minor", "currency", "frequency");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_rzp_subscription_id_key" ON "subscriptions" ("rzp_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions" ("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_rzp_payment_id_key" ON "subscription_payments" ("rzp_payment_id");

-- CreateIndex
CREATE INDEX "subscription_payments_subscription_id_idx" ON "subscription_payments" ("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_event_id_key" ON "webhook_events" ("event_id");

-- CreateIndex
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events" ("event_type");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing_customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "billing_plans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
