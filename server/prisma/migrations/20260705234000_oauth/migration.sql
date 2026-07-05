-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "users" ADD COLUMN "oauth_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_oauth_id_key" ON "users"("oauth_id");
