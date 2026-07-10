-- CreateTable
CREATE TABLE "user_ratings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "anime_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_ratings_user_id_idx" ON "user_ratings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_ratings_user_id_anime_id_key" ON "user_ratings"("user_id", "anime_id");

-- AddForeignKey
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_anime_id_fkey" FOREIGN KEY ("anime_id") REFERENCES "animes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
