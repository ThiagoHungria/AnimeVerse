"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Play,
  ListVideo,
  Calendar,
  Clapperboard,
  Users,
  Trophy,
} from "lucide-react";
import type { Anime } from "@/types";
import { useDominantColor } from "@/hooks/useDominantColor";
import { paletteToCssVars } from "@/utils/colorSystem";
import { fade, pulseGlow, staggerContainer, staggerItem } from "@/utils/animation";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { FavoriteButton } from "./FavoriteButton";
import { LibraryButton } from "./LibraryButton";
import { SmartTags } from "./SmartTags";
import { GlassPanel } from "@/components/ui/GlassPanel";

interface AnimeDetailCinematicProps {
  anime: Anime;
  watchHref?: string;
  resumeLabel: string;
}

/** Movie-landing style anime header with dynamic identity. */
export function AnimeDetailCinematic({
  anime,
  watchHref,
  resumeLabel,
}: AnimeDetailCinematicProps) {
  const palette = useDominantColor(anime.banner || anime.image, anime.id);
  const cssVars = paletteToCssVars(palette) as React.CSSProperties;

  return (
    <div className="relative pb-8" style={cssVars}>
      {/* Immersive banner */}
      <div className="relative h-[50vh] max-h-[520px] min-h-[320px] w-full overflow-hidden">
        {anime.banner && (
          <Image
            src={anime.banner}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover scale-105"
          />
        )}
        <div
          className="absolute inset-0 opacity-60"
          style={{ background: palette.gradient, mixBlendMode: "multiply" }}
        />
        <div className="from-background absolute inset-0 bg-gradient-to-t via-background/50 to-transparent" />

        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/3 size-[500px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: palette.primary }}
          variants={pulseGlow}
          initial="initial"
          animate="animate"
        />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 md:px-8">
        <motion.div
          className="-mt-32 flex flex-col gap-8 md:-mt-36 md:flex-row md:items-end"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={staggerItem}
            className="relative aspect-[2/3] w-44 shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-[var(--anime-glow)] md:w-56"
            style={{ viewTransitionName: `anime-poster-${anime.id}`, boxShadow: palette.glow }}
          >
            {anime.image && (
              <Image
                src={anime.image}
                alt={anime.title}
                fill
                priority
                sizes="224px"
                className="object-cover"
              />
            )}
          </motion.div>

          <motion.div variants={staggerItem} className="flex-1 space-y-4 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              {anime.rating > 0 && <RatingBadge rating={anime.rating} />}
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium backdrop-blur-md">
                {anime.statusLabel}
              </span>
              {anime.type && (
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium backdrop-blur-md">
                  {anime.type}
                </span>
              )}
            </div>

            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              {anime.title}
            </h1>
            {anime.titleEnglish && anime.titleEnglish !== anime.title && (
              <p className="text-muted -mt-2 text-sm">{anime.titleEnglish}</p>
            )}

            <SmartTags tags={anime.smartTags} max={6} withIcon animated />

            <div className="text-muted flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {anime.year && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4" /> {anime.year}
                </span>
              )}
              {anime.studio && (
                <span className="inline-flex items-center gap-1.5">
                  <Clapperboard className="size-4" /> {anime.studio}
                </span>
              )}
              {anime.episodeCount > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <ListVideo className="size-4" /> {anime.episodeCount} eps
                </span>
              )}
              {anime.rank && (
                <span className="inline-flex items-center gap-1.5">
                  <Trophy className="size-4" /> #{anime.rank}
                </span>
              )}
              {anime.members && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4" />
                  {Intl.NumberFormat("pt-BR", { notation: "compact" }).format(
                    anime.members,
                  )}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {anime.genres.map((genre) => (
                <Link
                  key={genre}
                  href={`/explore?genre=${encodeURIComponent(genre)}`}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs transition-colors hover:bg-white/10"
                >
                  {genre}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {watchHref && (
                <Link
                  href={watchHref}
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white shadow-xl transition-transform hover:scale-105"
                  style={{ background: palette.gradient, boxShadow: palette.glow }}
                >
                  <Play className="size-5 fill-white" />
                  {resumeLabel}
                </Link>
              )}
              <FavoriteButton anime={anime} variant="full" />
            </div>
            <LibraryButton anime={anime} />
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-10"
          variants={fade}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <GlassPanel tinted className="p-6 md:p-8">
            <h2 className="mb-3 text-lg font-bold">Sinopse</h2>
            <p className="text-muted-strong leading-relaxed">{anime.description}</p>
            {anime.background && (
              <p className="text-muted mt-4 text-sm leading-relaxed">
                {anime.background}
              </p>
            )}
          </GlassPanel>
        </motion.div>
      </div>
    </div>
  );
}
