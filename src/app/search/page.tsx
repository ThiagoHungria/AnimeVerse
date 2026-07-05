import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchClient } from "@/components/search/SearchClient";
import { GridSkeleton } from "@/components/ui/LoadingSkeleton";

export const metadata: Metadata = {
  title: "Buscar",
  description: "Busque animes por título ou gênero no AnimeVerse.",
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
          <div className="bg-card mb-8 h-14 w-full animate-pulse rounded-2xl" />
          <GridSkeleton />
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
