"use client";

import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { AnimeCard } from "./AnimeCard";
import { CardCinematicSkeleton } from "@/components/ui/CinematicSkeleton";
import { useSimilar } from "@/features/anime/hooks/useAnimeQueries";
import { revealUp, staggerContainer, staggerItem } from "@/utils/animation";

/** Similar animes with cinematic grid reveal. */
export function SimilarSection({
  animeId,
  title = "Animes parecidos",
}: {
  animeId: string;
  title?: string;
}) {
  const { data, isLoading } = useSimilar(animeId);

  if (!isLoading && (!data || data.length === 0)) return null;

  return (
    <motion.section
      className="mt-12"
      variants={revealUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <h2 className="mb-5 flex items-center gap-2 text-xl font-black">
        <Sparkles className="text-primary size-6" />
        {title}
      </h2>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardCinematicSkeleton key={i} />
          ))}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {data!.slice(0, 12).map((anime) => (
            <motion.div key={anime.id} variants={staggerItem}>
              <AnimeCard anime={anime} tilt />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.section>
  );
}
