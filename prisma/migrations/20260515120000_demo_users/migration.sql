-- Demo passwordless login allowlist (managed via DB / admin APIs when demo auth is enabled).

CREATE TABLE "demo_users" (
    "id" UUID NOT NULL,
    "sub" VARCHAR(256) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(200),
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "demo_users_sub_key" ON "demo_users"("sub");
CREATE UNIQUE INDEX "demo_users_email_key" ON "demo_users"("email");
CREATE INDEX "demo_users_email_is_enabled_idx" ON "demo_users"("email", "is_enabled");
