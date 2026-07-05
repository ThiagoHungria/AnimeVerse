"use client";

import { Heart } from "lucide-react";
import type { AnimeSummary } from "@/types";
import { useFavoritesStore } from "@/store/favorites.store";
import { useProfileStore } from "@/store/profile.store";
import { useHydrated } from "@/hooks/useHydrated";
import { syncFavoriteAction } from "@/services/syncService";
import { cn } from "@/utils/cn";

interface FavoriteButtonProps {
  anime: AnimeSummary;
  /** "icon" for card overlays, "full" for the details page button. */
  variant?: "icon" | "full";
  className?: string;
}

export function FavoriteButton({
  anime,
  variant = "icon",
  className,
}: FavoriteButtonProps) {
  const hydrated = useHydrated();
  const toggle = useFavoritesStore((s) => s.toggle);
  const items = useFavoritesStore((s) => s.items);
  const recordFavorite = useProfileStore((s) => s.recordFavorite);
  const active = hydrated && items.some((a) => a.id === anime.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Feed the taste profile when adding (not when removing).
    if (!active) {
      recordFavorite([
        ...anime.genres,
        ...anime.themes,
        ...anime.demographics,
      ]);
    }
    toggle(anime);
    syncFavoriteAction(anime, !active);
  };

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all active:scale-95",
          active
            ? "border-accent/50 bg-accent/15 text-accent"
            : "border-border-strong bg-white/5 text-foreground hover:bg-white/10",
          className,
        )}
      >
        <Heart className={cn("size-4", active && "fill-accent")} />
        {active ? "Favoritado" : "Favoritar"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={cn(
        "flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all hover:scale-110 active:scale-90",
        className,
      )}
    >
      <Heart
        className={cn("size-4", active ? "fill-accent text-accent" : "text-white")}
      />
    </button>
  );
}
