# doublle_ai_be

Express API for Doublle. ES modules, Node 20.19+ (Node 23+ recommended so Prisma 7's generated TypeScript client runs natively without a build step).

## Environment

Copy `.env.example` to `.env` and fill values.

- **Referral admin (Prisma + Supabase):** `DATABASE_URL` (Supabase transaction pooler — used by the app), `DIRECT_URL` (direct Postgres URL — used by `prisma migrate` via `prisma.config.js`), `ADMIN_JWT_SECRET` (required HS256 secret). Optional `ADMIN_JWT_SECRET_2` / `ADMIN_JWT_SECRET_3`: the API accepts admin JWTs signed with any of these when set (useful for demos with multiple admin identities).
- **Referral (user APIs):** `USER_JWT_SECRET` (required HS256 for dashboard user JWTs). Optional `USER_JWT_SECRET_2` / `USER_JWT_SECRET_3` for the same multi-secret behavior. Also `REFERRAL_PUBLIC_BASE_URL` (required absolute URL for returned `?ref=` links, e.g. your marketing site origin).
- **DB pool tuning (optional):** `DB_POOL_MAX`, `DB_POOL_IDLE_MS`, `DB_POOL_CONN_TIMEOUT_MS`, `DATABASE_SSL_REJECT_UNAUTHORIZED`.
- **Payments:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.

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

`POST|GET|PATCH` and `DELETE` / `POST .../activate` under **`/api/v1/admin/programs`**. Send `Authorization: Bearer <jwt>` where the JWT is HS256-signed with one of `ADMIN_JWT_SECRET`, `ADMIN_JWT_SECRET_2`, or `ADMIN_JWT_SECRET_3` (when configured), payload includes `sub` (admin id) and `role: "admin"`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start server |
| `npm test` | Jest tests |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:migrate` | Apply migrations (`migrate deploy`) |
