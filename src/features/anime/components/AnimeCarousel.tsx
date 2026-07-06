"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AnimeSummary } from "@/types";
import { AnimeCard } from "./AnimeCard";
import { revealUp, staggerContainer, staggerItem } from "@/utils/animation";

interface AnimeCarouselProps {
  title: string;
  animes: AnimeSummary[];
  eyebrow?: string;
}

/** Premium horizontal carousel with scroll reveal and depth. */
export function AnimeCarousel({ title, animes, eyebrow }: AnimeCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (animes.length === 0) return null;

  return (
    <motion.section
      variants={revealUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-5% 0px" }}
    >
      <div className="mb-4 flex items-end justify-between gap-4 px-4 md:px-8">
        <div>
          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--anime-accent,var(--color-primary))]">
              {eyebrow}
            </p>
          )}
          <h2 className="text-xl font-black tracking-tight md:text-2xl">{title}</h2>
        </div>
        <div className="hidden gap-2 md:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Anterior"
            className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-colors hover:bg-white/10"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Próximo"
            className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-colors hover:bg-white/10"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <motion.div
        ref={scrollerRef}
        className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 md:px-8"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {animes.map((anime) => (
          <motion.div
            key={anime.id}
            variants={staggerItem}
            className="w-36 shrink-0 snap-start sm:w-40 md:w-44 lg:w-48"
          >
            <AnimeCard anime={anime} tilt />
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
