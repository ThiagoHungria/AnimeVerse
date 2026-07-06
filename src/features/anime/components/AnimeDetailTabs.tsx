"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { Anime } from "@/types";
import { useAnimeCharacters, useAnimeStaff } from "@/features/anime/hooks/useAnimeQueries";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { TrailerEmbed } from "@/features/anime/components/TrailerEmbed";
import { SimilarSection } from "@/features/anime/components/SimilarSection";
import { EpisodeList } from "@/features/anime/components/EpisodeList";
import { SmartTags } from "@/features/anime/components/SmartTags";
import { GridSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users, Clapperboard } from "lucide-react";
import { fade } from "@/utils/animation";
import { cn } from "@/utils/cn";

const TABS = [
  { id: "info", label: "Informações" },
  { id: "related", label: "Relacionados" },
  { id: "characters", label: "Personagens" },
  { id: "staff", label: "Staff" },
  { id: "stats", label: "Estatísticas" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface AnimeDetailTabsProps {
  anime: Anime;
}

export function AnimeDetailTabs({ anime }: AnimeDetailTabsProps) {
  const [tab, setTab] = useState<TabId>("info");

  return (
    <div className="mt-10">
      <div className="scrollbar-hide flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative shrink-0 px-4 py-3 text-sm font-semibold transition-colors",
              tab === t.id ? "text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.id && (
              <motion.span
                layoutId="anime-tab-indicator"
                className="bg-brand-gradient absolute inset-x-2 -bottom-px h-0.5 rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          variants={fade}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="mt-8"
        >
          {tab === "info" && <InfoTab anime={anime} />}
          {tab === "related" && (
            <SimilarSection animeId={anime.id} title="Animes relacionados" />
          )}
          {tab === "characters" && <CharactersTab animeId={anime.id} />}
          {tab === "staff" && <StaffTab animeId={anime.id} anime={anime} />}
          {tab === "stats" && <StatsTab anime={anime} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function InfoTab({ anime }: { anime: Anime }) {
  return (
    <div className="space-y-8">
      <GlassPanel className="p-5 md:p-6">
        <h2 className="mb-3 text-lg font-bold">Sinopse</h2>
        <p className="text-muted-strong leading-relaxed">{anime.description}</p>
        <div className="mt-4">
          <SmartTags tags={anime.genres} max={6} withIcon />
        </div>
      </GlassPanel>

      {anime.trailerUrl && (
        <GlassPanel className="p-4 md:p-6">
          <h2 className="mb-3 text-lg font-bold">Trailer</h2>
          <TrailerEmbed
            embedUrl={anime.trailerUrl}
            poster={anime.banner}
            title={anime.title}
          />
        </GlassPanel>
      )}

      {anime.episodes.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-black">Episódios</h2>
          <EpisodeList animeId={anime.id} episodes={anime.episodes} />
        </section>
      )}
    </div>
  );
}

function CharactersTab({ animeId }: { animeId: string }) {
  const { data: characters, isLoading } = useAnimeCharacters(animeId);

  if (isLoading) return <GridSkeleton count={6} />;

  if (!characters?.length) {
    return (
      <EmptyState
        icon={Users}
        title="Sem personagens"
        description="Não encontramos elenco para este anime no MAL."
      />
    );
  }

  const mains = characters.filter((c) => c.role === "Main");
  const supporting = characters.filter((c) => c.role !== "Main");

  return (
    <div className="space-y-8">
      {mains.length > 0 && (
        <CharacterGrid title="Principais" items={mains} />
      )}
      {supporting.length > 0 && (
        <CharacterGrid title="Coadjuvantes" items={supporting.slice(0, 24)} />
      )}
    </div>
  );
}

function CharacterGrid({
  title,
  items,
}: {
  title: string;
  items: { id: string; name: string; image: string; role: string; voiceActor?: string }[];
}) {
  return (
    <section>
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((ch) => (
          <GlassPanel key={ch.id} className="flex items-center gap-4 p-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-card">
              {ch.image ? (
                <Image src={ch.image} alt={ch.name} fill sizes="64px" className="object-cover" />
              ) : (
                <div className="bg-card-hover flex size-full items-center justify-center text-2xl">
                  👤
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 font-semibold">{ch.name}</p>
              <p className="text-muted text-xs">{ch.role}</p>
              {ch.voiceActor && (
                <p className="text-muted mt-1 text-xs">
                  Seiyuu: <span className="text-foreground">{ch.voiceActor}</span>
                </p>
              )}
            </div>
          </GlassPanel>
        ))}
      </div>
    </section>
  );
}

function StaffTab({ animeId, anime }: { animeId: string; anime: Anime }) {
  const { data: staff, isLoading } = useAnimeStaff(animeId);

  if (isLoading) return <GridSkeleton count={6} />;

  const jikanStaff = staff ?? [];
  const meta = [
    { role: "Estúdio", name: anime.studio ?? (anime.studios.join(", ") || "—") },
    { role: "Tipo", name: anime.type ?? "TV" },
    {
      role: "Temporada",
      name: anime.season && anime.year ? `${anime.season} ${anime.year}` : "—",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {meta.map((s) => (
          <GlassPanel key={s.role} className="p-4">
            <p className="text-muted text-xs uppercase tracking-wide">{s.role}</p>
            <p className="mt-1 font-semibold">{s.name}</p>
          </GlassPanel>
        ))}
      </div>

      {jikanStaff.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="Staff indisponível"
          description="Dados de produção não encontrados no MAL."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {jikanStaff.map((person) => (
            <GlassPanel key={person.id} className="flex items-center gap-4 p-4">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-card">
                {person.image ? (
                  <Image
                    src={person.image}
                    alt={person.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <div className="bg-card-hover flex size-full items-center justify-center">
                    🎬
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{person.name}</p>
                <p className="text-muted line-clamp-2 text-xs">
                  {person.positions.join(" · ")}
                </p>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsTab({ anime }: { anime: Anime }) {
  const stats = [
    { label: "Nota MAL", value: anime.rating > 0 ? anime.rating.toFixed(2) : "—" },
    { label: "Ranking", value: anime.rank ? `#${anime.rank}` : "—" },
    { label: "Popularidade", value: anime.popularity ? `#${anime.popularity}` : "—" },
    { label: "Membros", value: anime.members ? anime.members.toLocaleString("pt-BR") : "—" },
    {
      label: "Favoritos MAL",
      value: anime.favorites ? anime.favorites.toLocaleString("pt-BR") : "—",
    },
    { label: "Status", value: anime.statusLabel },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((s) => (
        <GlassPanel key={s.label} className="p-5 text-center">
          <p className="text-muted text-xs uppercase tracking-wide">{s.label}</p>
          <p className="mt-2 text-2xl font-black">{s.value}</p>
        </GlassPanel>
      ))}
    </div>
  );
}
