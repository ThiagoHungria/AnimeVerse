import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import type { AnimeSummary } from "@/types";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { FavoriteButton } from "./FavoriteButton";
import { cn } from "@/utils/cn";

interface AnimeCardProps {
  anime: AnimeSummary;
  className?: string;
  /** Optional priority hint for above-the-fold images. */
  priority?: boolean;
}

/** Poster card with hover lift, gradient overlay and quick favorite action. */
export function AnimeCard({ anime, className, priority }: AnimeCardProps) {
  const topTag = anime.smartTags[0];

  return (
    <Link
      href={`/anime/${anime.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-xl hover:shadow-black/40",
        className,
      )}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        {anime.image ? (
          <Image
            src={anime.image}
            alt={anime.title}
            fill
            sizes="(max-width: 768px) 45vw, (max-width: 1200px) 25vw, 200px"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="bg-card-hover size-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

        {anime.rating > 0 && (
          <div className="absolute left-2 top-2">
            <RatingBadge rating={anime.rating} />
          </div>
        )}
        <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <FavoriteButton anime={anime} />
        </div>

        {topTag && (
          <div className="absolute inset-x-2 bottom-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
            <span className="bg-brand-gradient inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
              <Play className="size-3 fill-white" /> {topTag}
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-semibold">{anime.title}</h3>
        <p className="text-muted mt-0.5 line-clamp-1 text-xs">
          {anime.genres.slice(0, 2).join(" · ") ||
            anime.type ||
            "Anime"}
        </p>
      </div>
    </Link>
  );
}
