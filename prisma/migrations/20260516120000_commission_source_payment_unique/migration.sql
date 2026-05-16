-- One commission accrual per subscription payment (webhook idempotency).
CREATE UNIQUE INDEX "commissions_source_payment_id_key" ON "commissions"("source_payment_id");
