-- CreateTable
CREATE TABLE "library_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "anime_id" INTEGER NOT NULL,
    "list" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "library_entries_user_id_list_idx" ON "library_entries"("user_id", "list");

-- CreateIndex
CREATE UNIQUE INDEX "library_entries_user_id_anime_id_key" ON "library_entries"("user_id", "anime_id");

-- AddForeignKey
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_anime_id_fkey" FOREIGN KEY ("anime_id") REFERENCES "animes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
