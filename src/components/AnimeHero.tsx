"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Sparkles } from "lucide-react";
import type { AnimeSummary } from "@/types";
import { useDominantColor } from "@/hooks/useDominantColor";
import { paletteToCssVars } from "@/utils/colorSystem";
import { DynamicBackground } from "@/components/DynamicBackground";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { FavoriteButton } from "@/features/anime/components/FavoriteButton";
import { SmartTags } from "@/features/anime/components/SmartTags";
import { staggerContainer, staggerItem } from "@/utils/animation";
import { cn } from "@/utils/cn";

interface AnimeHeroProps {
  anime: AnimeSummary;
  className?: string;
  badge?: string;
}

/** Large cinematic hero card for home launches section. */
export function AnimeHero({ anime, className, badge }: AnimeHeroProps) {
  const palette = useDominantColor(anime.banner || anime.image, anime.id);
  const cssVars = paletteToCssVars(palette) as React.CSSProperties;
  const statusBadge =
    badge ??
    (anime.status === "ongoing"
      ? "Em andamento"
      : anime.status === "completed"
        ? "Finalizado"
        : anime.status === "upcoming"
          ? "Novo episódio"
          : undefined);

  return (
    <motion.article
      className={cn(
        "group relative h-[420px] w-full overflow-hidden rounded-2xl border border-white/10 md:h-[480px]",
        className,
      )}
      style={cssVars}
      variants={staggerItem}
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <DynamicBackground palette={palette} className="absolute inset-0" />
      {anime.banner && (
        <Image
          src={anime.banner}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className="from-background absolute inset-0 bg-gradient-to-t via-background/40 to-transparent" />

      <div className="relative flex h-full flex-col justify-end p-6 md:p-8">
        {statusBadge && (
          <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="size-3" />
            {statusBadge}
          </span>
        )}

        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <motion.h3
            variants={staggerItem}
            className="text-2xl font-black tracking-tight md:text-3xl"
          >
            {anime.title}
          </motion.h3>
          <motion.div variants={staggerItem} className="mt-2 flex flex-wrap items-center gap-2">
            {anime.rating > 0 && <RatingBadge rating={anime.rating} />}
            <SmartTags tags={anime.smartTags.slice(0, 2)} />
          </motion.div>
          <motion.p
            variants={staggerItem}
            className="text-muted-strong mt-3 line-clamp-2 max-w-lg text-sm"
          >
            {anime.description}
          </motion.p>
          <motion.div variants={staggerItem} className="mt-5 flex items-center gap-3">
            <Link
              href={`/anime/${anime.id}`}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105"
              style={{ background: palette.gradient, boxShadow: palette.glow }}
            >
              <Play className="size-4 fill-white" />
              Assistir
            </Link>
            <FavoriteButton anime={anime} />
          </motion.div>
        </motion.div>
      </div>
    </motion.article>
  );
}
