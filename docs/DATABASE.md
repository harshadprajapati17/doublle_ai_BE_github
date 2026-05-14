# Database Guide

Postgres (Supabase) accessed via Prisma. This doc is the single source of truth for **local setup**, **cloud deploys**, and **moving the database to another Supabase project/account**.

If something here conflicts with the root `README.md`, this doc wins for DB topics.

---

## 1. Stack

- **Engine:** Postgres 15+ (hosted on Supabase)
- **ORM/Client:** Prisma 7 (`@prisma/client`) with generator `prisma-client` (Rust-free) and the `@prisma/adapter-pg` driver adapter on top of `pg` (`node-postgres`).
- **Schema file:** `prisma/schema.prisma`
- **Generated client output:** `./generated/prisma/` (gitignored; produced by `prisma generate`, regenerated on `npm install` via `postinstall`).
- **Prisma config:** `prisma.config.js` (project root) — wires `DIRECT_URL` into `prisma migrate` / `prisma db execute`.
- **Migrations:** `prisma/migrations/*` (committed, applied with `prisma migrate deploy`).
- **Migration provider lock:** `prisma/migrations/migration_lock.toml` (`provider = "postgresql"` — do not edit)
- **Client singleton:** `data/prismaClient.js` (constructs `PrismaClient` with the `PrismaPg` adapter using `DATABASE_URL` and the pool tuning env vars).

### Schema overview

| Table                | Purpose                                                                  |
|----------------------|--------------------------------------------------------------------------|
| `programs`           | Referral programs (reward %, attribution, caps, currency, status, ...)   |
| `program_versions`   | Append-only history of program payloads, per `program_id` + `version`    |
| `admin_audit_logs`   | Admin actions (`actor_id`, `action`, `target_type`, `target_id`, payload)|

Postgres enums: `ProgramStatus`, `AttributionRule`, `RefereeBenefitType`, `CapBehavior`.

---

## 2. Environment variables

Two URLs are required. Both point at the **same** Supabase project but use different connection modes.

| Variable        | Used by                                       | Mode                                  | Notes                                                                       |
|-----------------|-----------------------------------------------|---------------------------------------|-----------------------------------------------------------------------------|
| `DATABASE_URL`  | App runtime (`PrismaPg` adapter via `pg`)     | **Transaction pooler** (PgBouncer)    | Port `6543`. Append `?pgbouncer=true&connection_limit=1` for serverless.    |
| `DIRECT_URL`    | `prisma migrate` (via `prisma.config.js`)     | **Direct** Postgres                   | Port `5432`. Required because migrations issue DDL the pooler can't proxy.  |

Where to find them in Supabase: **Project → Settings → Database → Connection string**.
- "Transaction" → `DATABASE_URL`
- "Direct connection" → `DIRECT_URL`

URL-encode any special chars in the password (`@`, `#`, `:`, `/`, `?`).

### Optional pool tuning

The Prisma client uses `pg`'s connection pool through the driver adapter. Defaults are sensible for dev; tune in production via:

| Variable                          | Default | Maps to                          |
|-----------------------------------|---------|----------------------------------|
| `DB_POOL_MAX`                     | `10`    | `pg.Pool { max }`                |
| `DB_POOL_IDLE_MS`                 | `30000` | `pg.Pool { idleTimeoutMillis }`  |
| `DB_POOL_CONN_TIMEOUT_MS`         | `5000`  | `pg.Pool { connectionTimeoutMillis }` |
| `DATABASE_SSL_REJECT_UNAUTHORIZED`| _unset_ | If set to `false`, passes `{ ssl: { rejectUnauthorized: false } }`. Only use for dev/self-signed; Supabase certs are valid out of the box. |

> Never commit real values. Update `.env.example` only when adding/renaming variables.

---

## 3. Local development

### First-time setup

```bash
cp .env.example .env
# Fill DATABASE_URL and DIRECT_URL with your Supabase project credentials
npm install                  # postinstall runs `prisma generate` automatically
npx prisma migrate deploy    # apply committed migrations to your DB
```

### Day-to-day

```bash
npm run db:generate          # regenerate Prisma Client after schema.prisma changes
npm run db:migrate           # apply pending migrations (production-safe)
```

### Changing the schema

1. Edit `prisma/schema.prisma`.
2. Create a migration locally (uses `DIRECT_URL`):

   ```bash
   npx prisma migrate dev --name <short_snake_case_name>
   ```

   This generates a new folder under `prisma/migrations/` and applies it locally.
3. Inspect the generated SQL. Edit it if Prisma's diff isn't what you want (e.g. backfills, custom indexes).
4. Commit the new migration folder **and** any `schema.prisma` changes together.
5. Open a PR. CI/deploy will run `prisma migrate deploy` against the target environment.

> Do not use `prisma db push` against shared or production databases — it bypasses migration history.

### Inspecting data

```bash
npx prisma studio            # local GUI on localhost:5555
```

Or use Supabase's SQL editor in the dashboard.

---

## 4. Deploying to the cloud

Whatever the host (Render, Fly, Railway, Vercel, ECS, ...), the lifecycle is the same:

1. **Build step** — `npm install` runs, which triggers `postinstall` → `npm run db:generate` → `prisma generate`. This bakes the Prisma Client into the deployable artifact.
2. **Release/pre-start step** — run migrations against the target DB **before** the new app code starts serving traffic:

   ```bash
   npm run db:migrate
   ```

   This is idempotent: it only applies migrations not yet recorded in `_prisma_migrations`.
3. **Runtime** — the app connects using `DATABASE_URL` (pooler). `DIRECT_URL` is only needed at migrate time but it's fine to keep it set everywhere.

### Required env vars in the cloud

- `DATABASE_URL` (pooler, with `?pgbouncer=true&connection_limit=1` recommended for serverless)
- `DIRECT_URL` (direct connection, used by the release-phase migrate step)
- `ADMIN_JWT_SECRET`
- Anything else from `.env.example`

### Host-specific notes

- **Render / Railway / Fly**: add a "release command" or pre-deploy hook that runs `npm run db:migrate`.
- **Vercel / serverless**: run `npm run db:migrate` from CI (e.g. GitHub Actions) on the `main` branch *before* promoting the deployment. Don't run migrations from a serverless function.
- **Docker**: keep migrations out of `CMD`. Run `npm run db:migrate` as a one-off task / init container before rolling out.

### Smoke check after deploy

```sql
select migration_name, finished_at
from _prisma_migrations
order by finished_at desc
limit 5;
```

All expected migrations should appear with non-null `finished_at`.

---

## 5. Moving to another Supabase account / project

Use this checklist when migrating to a new Supabase organization, account, or project (e.g. handover, cost split, region change).

### 5.1 Pre-flight

- [ ] Decide on the target region (keep it close to the app host).
- [ ] Create the new Supabase project. Save the DB password somewhere safe.
- [ ] Note both connection strings (pooler + direct) for the **new** project.
- [ ] Schedule a short maintenance window (writes will be paused).

### 5.2 Capture a snapshot of the old database

From a machine that can reach the **old** project's direct URL:

```bash
# Full logical dump (schema + data). Uses DIRECT URL, not the pooler.
pg_dump \
  --no-owner --no-privileges \
  --format=custom \
  --file=doublle_old.dump \
  "$OLD_DIRECT_URL"
```

Notes:
- Use `pg_dump` from a version `>=` the server version.
- `--no-owner --no-privileges` keeps the dump portable across Supabase projects (roles differ).
- For data-only or schema-only variants use `--data-only` / `--schema-only`.

### 5.3 Prepare the new database

Option A — **Recommended: let Prisma own the schema.**

```bash
# Point env at the NEW project
export DATABASE_URL="<new pooler url>"
export DIRECT_URL="<new direct url>"

npm install
npm run db:migrate           # applies all committed migrations on the new DB
```

Then restore **data only**:

```bash
pg_restore \
  --no-owner --no-privileges \
  --data-only \
  --disable-triggers \
  --dbname="$NEW_DIRECT_URL" \
  doublle_old.dump
```

`--disable-triggers` avoids FK ordering issues during bulk insert. `--data-only` skips schema, which Prisma already created.

Option B — **Restore everything from the dump** (skip Prisma migrate on the new DB):

```bash
pg_restore \
  --no-owner --no-privileges \
  --dbname="$NEW_DIRECT_URL" \
  doublle_old.dump
```

Use this only if you understand that the new DB's `_prisma_migrations` history must come over too — otherwise the next `prisma migrate deploy` will misbehave.

### 5.4 Verify

```sql
-- Row count parity (run on both old + new)
select 'programs' as t, count(*) from programs
union all select 'program_versions', count(*) from program_versions
union all select 'admin_audit_logs', count(*) from admin_audit_logs;

-- Migration history present
select count(*) from _prisma_migrations;
```

Also run the app's test suite against the new DB or hit a couple of read endpoints in a staging deploy.

### 5.5 Cut over

1. Stop writes to the old DB (scale app to 0, or flip to read-only).
2. Take a final incremental dump if anything changed since 5.2 and replay it.
3. Update `DATABASE_URL` + `DIRECT_URL` in **all** environments (cloud host, CI, local `.env.example` defaults if any).
4. Redeploy the app. The release step runs `npm run db:migrate` (no-op if 5.3 Option A was used).
5. Smoke test the live endpoints.
6. Keep the old project read-only for at least 7 days as a rollback safety net before deleting.

### 5.6 Don't forget

- Rotate `ADMIN_JWT_SECRET` if it was shared with the previous account's operators.
- Re-create any Supabase-specific resources that aren't in `prisma/migrations/`:
  - Row Level Security policies
  - Database roles / API keys
  - Scheduled functions / `pg_cron` jobs
  - Storage buckets (if used)
  - Realtime publications (if used)
- Update billing owner and add team members in the new Supabase org.

---

## 6. Backups

Supabase takes automated daily backups on paid plans. For extra safety:

```bash
# Cron this on a trusted host
pg_dump --format=custom --no-owner --no-privileges \
  --file="doublle_$(date +%F).dump" "$DIRECT_URL"
```

Store off-site (S3, GCS) with retention.

---

## 7. Troubleshooting

| Symptom                                                              | Likely cause / fix                                                                                  |
|----------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| `prisma migrate` hangs or errors with `prepared statement` warnings  | You're pointing migrate at the pooler. It must use `DIRECT_URL` (port `5432`).                      |
| App throws `Can't reach database server`                             | Wrong `DATABASE_URL`, or IP not allowed in Supabase network restrictions, or password not URL-encoded. |
| `Too many connections` on serverless                                 | Use the pooler URL and append `?pgbouncer=true&connection_limit=1`.                                 |
| `P3009 migrate found failed migrations`                              | Inspect `_prisma_migrations`, fix the underlying DB state, then `prisma migrate resolve`.           |
| Prisma Client out of sync after pulling main                         | `npm run db:generate`.                                                                              |
| Schema drift between envs                                            | Run `npx prisma migrate status` against each env; never use `db push` on shared DBs.                |

---

## 8. Scripts reference

| Script                  | What it runs              | When to use                                              |
|-------------------------|---------------------------|----------------------------------------------------------|
| `npm run db:generate`   | `prisma generate`         | After editing `schema.prisma`, or after `npm install`.    |
| `npm run db:migrate`    | `prisma migrate deploy`   | Release/deploy step. Production-safe, idempotent.        |
| `npm run postinstall`   | `npm run db:generate`     | Runs automatically after `npm install`.                  |

For schema authoring locally, use `npx prisma migrate dev --name <name>` directly.
