-- Demo passwordless admin login allowlist (managed via DB / admin APIs when demo auth is enabled).

CREATE TABLE "demo_admins" (
    "id" UUID NOT NULL,
    "sub" VARCHAR(256) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(200),
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_admins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "demo_admins_sub_key" ON "demo_admins"("sub");
CREATE UNIQUE INDEX "demo_admins_email_key" ON "demo_admins"("email");
CREATE INDEX "demo_admins_email_is_enabled_idx" ON "demo_admins"("email", "is_enabled");
