import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure it in your environment.");
}

const adapter = new PrismaPg({
  connectionString,
  // Supabase and most managed Postgres providers require TLS; default rejectUnauthorized=true
  // unless DATABASE_SSL_REJECT_UNAUTHORIZED=false is set explicitly (use with care).
  ssl:
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false"
      ? { rejectUnauthorized: false }
      : undefined,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS ?? 30000),
  connectionTimeoutMillis: Number(process.env.DB_POOL_CONN_TIMEOUT_MS ?? 5000),
});

export const prisma = new PrismaClient({ adapter });
