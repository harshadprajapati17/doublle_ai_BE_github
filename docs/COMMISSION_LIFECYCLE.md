# Commission lifecycle jobs

Commission state flow: **PENDING** → **EARNED** → **PAID** (or **CLAWED_BACK** on refund).

| Transition | Trigger |
| --- | --- |
| Accrual | Razorpay `payment.captured` / `subscription.charged` webhook |
| PENDING → EARNED | Scheduled job: `payable_at <= now` |
| EARNED → PAID | Scheduled job: `applyEarnedCredit` (stub credit until billing integration) |
| Clawback | Razorpay payment `refunded` webhook on linked `subscription_payments` row |

## Internal HTTP endpoints

Requires `INTERNAL_CRON_SECRET` and header `X-Internal-Cron-Secret`.

```bash
# 1) Move held commissions to EARNED
curl -sS -X POST "$BASE_URL/api/v1/internal/commissions/transition-earned" \
  -H "X-Internal-Cron-Secret: $INTERNAL_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'

# 2) Apply earned credit (stub logs today)
curl -sS -X POST "$BASE_URL/api/v1/internal/commissions/apply-credit" \
  -H "X-Internal-Cron-Secret: $INTERNAL_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'

# Or both in order:
curl -sS -X POST "$BASE_URL/api/v1/internal/commissions/run-lifecycle" \
  -H "X-Internal-Cron-Secret: $INTERNAL_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'
```

Optional body fields:

- `transition-earned` / `run-lifecycle`: `asOf` (ISO date-time, default now)
- `apply-credit` / `run-lifecycle`: `limit` (max rows per run, default 100), `commissionId` (single row, apply-credit only)

## Suggested cron (hourly)

On a trusted host or platform scheduler (Render cron, GitHub Actions, etc.):

```cron
0 * * * * curl -fsS -X POST "$PUBLIC_API_URL/api/v1/internal/commissions/run-lifecycle" \
  -H "X-Internal-Cron-Secret: $INTERNAL_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"limit": 500}'
```

Refund clawbacks run automatically from the Razorpay webhook when payment status becomes `REFUNDED`; no cron needed for that path.

## Logs

Structured JSON logs use `scope: "referral.commission"` with phases such as `transition_pending_to_earned`, `credit_apply_stub`, `apply_earned_credit`, `clawed_back`.
