import Image from "next/image";
import Link from "next/link";
import { Play, Info } from "lucide-react";
import type { AnimeSummary } from "@/types";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { FavoriteButton } from "./FavoriteButton";
import { SmartTags } from "./SmartTags";

/** Full-bleed featured hero used at the top of the Home page. */
export function HeroSection({ anime }: { anime: AnimeSummary }) {
  return (
    <section className="animate-fade-in relative h-[62vh] max-h-[600px] min-h-[420px] w-full overflow-hidden md:rounded-b-3xl">
      <Image
        src={anime.banner}
        alt={anime.title}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 px-4 pb-10 md:px-8 md:pb-14">
        <div className="max-w-2xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <RatingBadge rating={anime.rating} />
            {anime.year && (
              <span className="text-muted-strong rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium">
                {anime.year}
              </span>
            )}
            <span className="text-muted-strong rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium">
              {anime.episodeCount} episódios
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            {anime.title}
          </h1>

          <SmartTags tags={anime.smartTags} max={4} withIcon />

          <div className="flex flex-wrap gap-2">
            {anime.genres.map((genre) => (
              <span
                key={genre}
                className="text-muted-strong rounded-full border border-border-strong px-3 py-1 text-xs"
              >
                {genre}
              </span>
            ))}
          </div>

          <p className="text-muted-strong line-clamp-3 max-w-xl text-sm md:text-base">
            {anime.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href={`/watch/${anime.id}/${anime.id}-ep-1`}
              className="bg-brand-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <Play className="size-5 fill-white" /> Assistir agora
            </Link>
            <Link
              href={`/anime/${anime.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-white/5 px-6 py-3 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              <Info className="size-5" /> Detalhes
            </Link>
            <FavoriteButton anime={anime} variant="full" />
          </div>
        </div>
      </div>
    </section>
  );
}
