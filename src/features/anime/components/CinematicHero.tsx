"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Play, Info, Sparkles } from "lucide-react";
import type { AnimeSummary } from "@/types";
import { useDominantColor } from "@/hooks/useDominantColor";
import { paletteToCssVars } from "@/utils/colorSystem";
import { pulseGlow, fade } from "@/utils/animation";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { FavoriteButton } from "./FavoriteButton";
import { SmartTags } from "./SmartTags";

/** Cinematic hero with parallax scroll, dynamic palette and living background. */
export function CinematicHero({ anime }: { anime: AnimeSummary }) {
  const ref = useRef<HTMLElement>(null);
  const palette = useDominantColor(anime.banner || anime.image, anime.id);
  const cssVars = paletteToCssVars(palette) as React.CSSProperties;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.22]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0.15]);

  return (
    <section
      ref={ref}
      className="relative h-[72vh] max-h-[680px] min-h-[460px] w-full overflow-hidden md:rounded-b-3xl"
      style={cssVars}
    >
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ y: imageY, scale: imageScale }}
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
      <div className="from-background via-background/75 absolute inset-0 bg-gradient-to-t to-transparent cinematic-vignette" />
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
        style={{ y: contentY, opacity: contentOpacity }}
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

          <h1
            className="text-4xl font-black tracking-tight drop-shadow-lg md:text-6xl"
            style={{ viewTransitionName: `hero-title-${anime.id}` }}
          >
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
              className="vt-link inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold backdrop-blur-md transition-colors hover:bg-white/15"
              style={{ viewTransitionName: `anime-poster-${anime.id}` }}
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

export const HeroSection = CinematicHero;
