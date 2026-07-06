"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import type { AnimeSummary } from "@/types";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { cn } from "@/utils/cn";

interface RankingCardProps {
  anime: AnimeSummary;
  rank: number;
  metric?: "popular" | "rating" | "members";
  className?: string;
}

/** Ranking list item with position, cover and score. */
export function RankingCard({
  anime,
  rank,
  metric = "rating",
  className,
}: RankingCardProps) {
  const metricValue =
    metric === "popular"
      ? anime.popularity
        ? `#${anime.popularity}`
        : "—"
      : metric === "members"
        ? anime.members
          ? `${(anime.members / 1000).toFixed(0)}k`
          : "—"
        : anime.rating > 0
          ? anime.rating.toFixed(1)
          : "—";

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.04 }}
      className={cn("group", className)}
    >
      <Link
        href={`/anime/${anime.id}`}
        className="border-border bg-card/40 hover:bg-card-hover flex items-center gap-4 rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:border-white/15"
      >
        <span
          className={cn(
            "w-8 shrink-0 text-center text-2xl font-black italic",
            rank <= 3 ? "text-brand-gradient" : "text-muted",
          )}
        >
          {rank}
        </span>

        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg">
          {anime.image ? (
            <Image
              src={anime.image}
              alt={anime.title}
              fill
              sizes="56px"
              className="object-cover transition-transform group-hover:scale-110"
            />
          ) : (
            <div className="bg-card-hover size-full" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 font-semibold">{anime.title}</h3>
          <p className="text-muted line-clamp-1 text-xs">
            {anime.genres.slice(0, 2).join(" · ")}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {anime.rating > 0 && <RatingBadge rating={anime.rating} />}
          <span className="text-muted flex items-center gap-1 text-xs">
            <TrendingUp className="size-3" />
            {metricValue}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
