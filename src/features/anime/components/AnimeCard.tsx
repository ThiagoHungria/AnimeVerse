"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Play } from "lucide-react";
import type { AnimeSummary } from "@/types";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { FavoriteButton } from "./FavoriteButton";
import { cn } from "@/utils/cn";
import { springSnappy } from "@/utils/animation";

interface AnimeCardProps {
  anime: AnimeSummary;
  className?: string;
  priority?: boolean;
  /** Enable subtle 3D tilt on hover. */
  tilt?: boolean;
}

export function AnimeCard({
  anime,
  className,
  priority,
  tilt = false,
}: AnimeCardProps) {
  const topTag = anime.smartTags[0];
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), springSnappy);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), springSnappy);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tilt) return;
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
      style={tilt ? { rotateX, rotateY } : undefined}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileHover={{ y: -6 }}
      transition={springSnappy}
    >
      <Link
        href={`/anime/${anime.id}`}
        className="group relative block h-full overflow-hidden rounded-xl border border-white/10 bg-card shadow-lg shadow-black/30 transition-shadow duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {anime.image ? (
            <Image
              src={anime.image}
              alt={anime.title}
              fill
              sizes="(max-width: 768px) 45vw, (max-width: 1200px) 25vw, 200px"
              priority={priority}
              loading={priority ? undefined : "lazy"}
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="bg-card-hover size-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          {anime.rating > 0 && (
            <div className="absolute left-2 top-2">
              <RatingBadge rating={anime.rating} />
            </div>
          )}
          <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <FavoriteButton anime={anime} />
          </div>

          {topTag && (
            <div className="absolute inset-x-2 bottom-2 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <span className="bg-brand-gradient inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
                <Play className="size-3 fill-white" /> {topTag}
              </span>
            </div>
          )}
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
