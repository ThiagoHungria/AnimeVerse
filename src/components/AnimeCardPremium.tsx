"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Play } from "lucide-react";
import type { AnimeSummary } from "@/types";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { FavoriteButton } from "@/features/anime/components/FavoriteButton";
import { useDominantColor } from "@/hooks/useDominantColor";
import { cn } from "@/utils/cn";
import { springSnappy } from "@/utils/animation";

interface AnimeCardPremiumProps {
  anime: AnimeSummary;
  className?: string;
  priority?: boolean;
  rank?: number;
}

/** Premium card with dynamic glow, hover scale and 3D tilt. */
export function AnimeCardPremium({
  anime,
  className,
  priority,
  rank,
}: AnimeCardPremiumProps) {
  const palette = useDominantColor(anime.image, anime.id);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), springSnappy);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), springSnappy);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={cn("h-full [perspective:900px]", className)}
      style={{ rotateX, rotateY }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileHover={{ y: -8 }}
      transition={springSnappy}
    >
      <Link
        href={`/anime/${anime.id}`}
        className="group relative block h-full overflow-hidden rounded-xl border border-white/10 bg-card shadow-lg shadow-black/40 transition-all duration-300 hover:border-white/25 hover:shadow-2xl"
        style={{
          viewTransitionName: `anime-poster-${anime.id}`,
          boxShadow: `0 8px 32px -8px ${palette.primary}30`,
        }}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {anime.image ? (
            <Image
              src={anime.image}
              alt={anime.title}
              fill
              sizes="(max-width: 768px) 45vw, 200px"
              priority={priority}
              loading={priority ? undefined : "lazy"}
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="bg-card-hover size-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

          {rank !== undefined && (
            <span
              className="absolute -left-1 top-2 text-5xl font-black italic leading-none opacity-90"
              style={{
                WebkitTextStroke: "2px rgba(255,255,255,0.3)",
                color: "transparent",
              }}
            >
              {rank}
            </span>
          )}

          {anime.rating > 0 && (
            <div className="absolute right-2 top-2">
              <RatingBadge rating={anime.rating} />
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span
              className="flex size-12 items-center justify-center rounded-full shadow-xl"
              style={{ background: palette.gradient }}
            >
              <Play className="size-5 fill-white text-white" />
            </span>
          </div>

          <div className="absolute right-2 bottom-2 opacity-0 transition-opacity group-hover:opacity-100">
            <FavoriteButton anime={anime} />
          </div>
        </div>

        <div className="p-3">
          <h3 className="line-clamp-1 text-sm font-bold">{anime.title}</h3>
          <p className="text-muted mt-0.5 line-clamp-1 text-xs">
            {anime.genres.slice(0, 2).join(" · ") || anime.type || "Anime"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
