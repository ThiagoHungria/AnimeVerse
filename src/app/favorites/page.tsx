"use client";

import { Heart } from "lucide-react";
import { useFavoritesStore } from "@/store/favorites.store";
import { useHydrated } from "@/hooks/useHydrated";
import { AnimeCard } from "@/features/anime/components/AnimeCard";
import { GridSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";

export default function FavoritesPage() {
  const hydrated = useHydrated();
  const items = useFavoritesStore((s) => s.items);
  const clear = useFavoritesStore((s) => s.clear);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <Heart className="text-accent fill-accent size-6" /> Favoritos
          </h1>
          <p className="text-muted mt-1 text-sm">
            Seus animes salvos, sincronizados neste dispositivo.
          </p>
        </div>
        {hydrated && items.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-muted hover:text-foreground text-sm transition-colors"
          >
            Limpar tudo
          </button>
        )}
      </div>

      <div className="mt-8">
        {!hydrated ? (
          <GridSkeleton count={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Nenhum favorito ainda"
            description="Toque no coração de qualquer anime para salvá-lo aqui."
            action={{ label: "Explorar catálogo", href: "/explore" }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
