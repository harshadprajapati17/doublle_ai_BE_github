# doublle_ai_be

Express API for Doublle.

## Environment

Copy `.env.example` to `.env` and fill values.

- **Referral admin (Prisma + Supabase):** `DATABASE_URL` (Supabase transaction pooler), `DIRECT_URL` (direct Postgres URL for `prisma migrate`), `ADMIN_JWT_SECRET` (HS256 secret for admin JWTs).
- **Payments:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.

## Database

Postgres on Supabase via Prisma. See **[docs/DATABASE.md](docs/DATABASE.md)** for the full guide: local setup, migrations, cloud deploys, and moving to another Supabase account.

Quick start once `DATABASE_URL` and `DIRECT_URL` are set:

```bash
npm install            # postinstall regenerates Prisma Client
npm run db:migrate     # apply committed migrations
```

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
