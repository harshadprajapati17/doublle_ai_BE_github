-- AlterTable
ALTER TABLE "demo_users" ADD COLUMN "password" VARCHAR(255) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "demo_admins" ADD COLUMN "password" VARCHAR(255) NOT NULL DEFAULT '';

ALTER TABLE "demo_users" ALTER COLUMN "password" DROP DEFAULT;
ALTER TABLE "demo_admins" ALTER COLUMN "password" DROP DEFAULT;
