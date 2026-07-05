"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, SearchX } from "lucide-react";
import { AnimeCard } from "@/features/anime/components/AnimeCard";
import { GridSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSearch, useGenres } from "@/features/anime/hooks/useAnimeQueries";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/utils/cn";

export function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [genre, setGenre] = useState<string | null>(
    searchParams.get("genre"),
  );

  const debouncedQuery = useDebounce(query, 300);

  const { data: genres } = useGenres();
  const { data: results, isFetching } = useSearch({
    query: debouncedQuery,
    genre: genre ?? undefined,
  });

  // Keep the URL in sync so searches are shareable / bookmarkable.
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    if (genre) params.set("genre", genre);
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
  }, [debouncedQuery, genre, router]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold md:text-3xl">Buscar animes</h1>
      <p className="text-muted mt-1 text-sm">
        Encontre seu próximo anime favorito em tempo real.
      </p>

      <div className="relative mt-6">
        <SearchIcon className="text-muted pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite o nome de um anime ou gênero..."
          aria-label="Buscar animes"
          className="border-border bg-card focus:border-primary w-full rounded-2xl border py-4 pl-12 pr-4 text-base outline-none transition-colors"
        />
      </div>

      {/* Genre filters */}
      <div className="scrollbar-hide mt-4 flex gap-2 overflow-x-auto pb-1">
        <FilterChip
          label="Todos"
          active={!genre}
          onClick={() => setGenre(null)}
        />
        {genres?.map((g) => (
          <FilterChip
            key={g}
            label={g}
            active={genre === g}
            onClick={() => setGenre(genre === g ? null : g)}
          />
        ))}
      </div>

      <div className="mt-8">
        {isFetching && !results ? (
          <GridSkeleton />
        ) : results && results.length > 0 ? (
          <>
            <p className="text-muted mb-4 text-sm">
              {results.length}{" "}
              {results.length === 1 ? "resultado" : "resultados"}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {results.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={SearchX}
            title="Nenhum resultado encontrado"
            description="Tente outro termo ou remova os filtros de gênero."
            action={{ label: "Ver catálogo completo", href: "/search" }}
          />
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
        active
          ? "border-transparent bg-brand-gradient text-white"
          : "border-border bg-card text-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
