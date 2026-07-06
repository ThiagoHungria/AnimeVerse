"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Info, Sparkles } from "lucide-react";
import type { AnimeSummary } from "@/types";
import { useDominantColor } from "@/hooks/useDominantColor";
import { paletteToCssVars } from "@/utils/colorSystem";
import { heroKenBurns, pulseGlow, fade } from "@/utils/animation";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { FavoriteButton } from "./FavoriteButton";
import { SmartTags } from "./SmartTags";

/** Cinematic full-bleed hero with dynamic palette and living background. */
export function CinematicHero({ anime }: { anime: AnimeSummary }) {
  const palette = useDominantColor(anime.banner || anime.image, anime.id);
  const cssVars = paletteToCssVars(palette) as React.CSSProperties;

  return (
    <section
      className="relative h-[68vh] max-h-[640px] min-h-[440px] w-full overflow-hidden md:rounded-b-3xl"
      style={cssVars}
    >
      <motion.div
        className="absolute inset-0"
        variants={heroKenBurns}
        initial="initial"
        animate="animate"
      >
        <Image
          src={anime.banner}
          alt={anime.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>

      <div
        className="absolute inset-0 opacity-70"
        style={{ background: palette.gradient, mixBlendMode: "multiply" }}
      />
      <div className="from-background via-background/75 absolute inset-0 bg-gradient-to-t to-transparent" />
      <div className="from-background/95 via-background/40 absolute inset-0 bg-gradient-to-r to-transparent" />

      <motion.div
        className="pointer-events-none absolute -right-20 top-1/4 size-96 rounded-full blur-3xl"
        style={{ background: palette.primary }}
        variants={pulseGlow}
        initial="initial"
        animate="animate"
      />

      <motion.div
        className="absolute inset-x-0 bottom-0 px-4 pb-10 md:px-8 md:pb-14"
        variants={fade}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-2xl space-y-4">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
            <Sparkles className="size-3.5" style={{ color: palette.accent }} />
            Destaque AnimeVerse
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <RatingBadge rating={anime.rating} />
            {anime.year && (
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium backdrop-blur-md">
                {anime.year}
              </span>
            )}
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium backdrop-blur-md">
              {anime.episodeCount} eps
            </span>
          </div>

          <h1 className="text-4xl font-black tracking-tight drop-shadow-lg md:text-6xl">
            {anime.title}
          </h1>

          <SmartTags tags={anime.smartTags} max={4} withIcon />

          <p className="line-clamp-3 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">
            {anime.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={`/watch/${anime.id}/${anime.id}-ep-1`}
              className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
              style={{
                background: palette.gradient,
                boxShadow: palette.glow,
              }}
            >
              <Play className="size-5 fill-white" /> Assistir agora
            </Link>
            <Link
              href={`/anime/${anime.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold backdrop-blur-md transition-colors hover:bg-white/15"
            >
              <Info className="size-5" /> Detalhes
            </Link>
            <FavoriteButton anime={anime} variant="full" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/** Back-compat alias. */
export const HeroSection = CinematicHero;
