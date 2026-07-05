"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AnimeSummary } from "@/types";
import { AnimeCard } from "./AnimeCard";

interface AnimeCarouselProps {
  title: string;
  animes: AnimeSummary[];
  /** Optional accent label, e.g. a genre name. */
  eyebrow?: string;
}

/** Netflix-style horizontal carousel with snap scrolling and arrow controls. */
export function AnimeCarousel({ title, animes, eyebrow }: AnimeCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (animes.length === 0) return null;

  return (
    <section className="animate-fade-up">
      <div className="mb-3 flex items-end justify-between gap-4 px-4 md:px-8">
        <div>
          {eyebrow && (
            <p className="text-primary text-xs font-semibold uppercase tracking-wider">
              {eyebrow}
            </p>
          )}
          <h2 className="text-lg font-bold md:text-xl">{title}</h2>
        </div>
        <div className="hidden gap-2 md:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Anterior"
            className="border-border bg-card hover:bg-card-hover flex size-9 items-center justify-center rounded-full border transition-colors"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Próximo"
            className="border-border bg-card hover:bg-card-hover flex size-9 items-center justify-center rounded-full border transition-colors"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:px-8"
      >
        {animes.map((anime) => (
          <AnimeCard
            key={anime.id}
            anime={anime}
            className="w-36 shrink-0 snap-start sm:w-40 md:w-44 lg:w-48"
          />
        ))}
      </div>
    </section>
  );
}
