# doublle_ai_be

Express API for Doublle. ES modules, Node 20.19+ (Node 23+ recommended so Prisma 7's generated TypeScript client runs natively without a build step).

## Environment

Copy `.env.example` to `.env` and fill values.

- **Referral admin (Prisma + Supabase):** `DATABASE_URL` (Supabase transaction pooler — used by the app), `DIRECT_URL` (direct Postgres URL — used by `prisma migrate` via `prisma.config.js`), `ADMIN_JWT_SECRET` (required HS256 secret for admin auth).
- **Referral (user APIs):** `USER_JWT_SECRET` (required HS256 for dashboard user JWTs). Referrers share their referral **code** from the app; the client builds any share URL if needed.
- **Auth:** `POST /api/v1/auth/signup-referral`, `signin-referral`, `admin-signup-referral`, `admin-signin-referral` (email + password against `demo_users` / `demo_admins`).
- **DB pool tuning (optional):** `DB_POOL_MAX`, `DB_POOL_IDLE_MS`, `DB_POOL_CONN_TIMEOUT_MS`, `DATABASE_SSL_REJECT_UNAUTHORIZED`.
- **Billing (Razorpay subscriptions):** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

## Database

Postgres on Supabase via Prisma. See **[docs/DATABASE.md](docs/DATABASE.md)** for the full guide: local setup, migrations, cloud deploys, and moving to another Supabase account.

Quick start once `DATABASE_URL` and `DIRECT_URL` are set:

```bash
npm install            # postinstall regenerates Prisma Client into ./generated/prisma
npm run db:migrate     # apply committed migrations (uses DIRECT_URL via prisma.config.js)
```

The generated client lives at `./generated/prisma/` (gitignored). Never edit it by hand — `prisma generate` overwrites it.

Before production releases, skim the [Supabase changelog](https://supabase.com/changelog.md) for breaking changes affecting Postgres/pooler.

## Admin referral programs

`POST|GET|PATCH` and `DELETE` / `POST .../activate` under **`/api/v1/admin/programs`**. Send `Authorization: Bearer <jwt>` where the JWT is HS256-signed with `ADMIN_JWT_SECRET`, payload includes `sub` (admin id) and `role: "admin"`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start server |
| `npm test` | Jest tests |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:migrate` | Apply migrations (`migrate deploy`) |
