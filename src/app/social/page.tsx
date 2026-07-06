"use client";

import { Users, MessageCircle, Flame, Sparkles } from "lucide-react";
import { useTrending } from "@/features/anime/hooks/useAnimeQueries";
import { AnimeCardPremium } from "@/components/AnimeCardPremium";
import { CarouselSkeleton } from "@/components/ui/LoadingSkeleton";
import { GlassPanel } from "@/components/ui/GlassPanel";

const MOCK_ACTIVITY = [
  { user: "Otaku_BR", action: "completou", anime: "Jujutsu Kaisen", time: "2min" },
  { user: "AnimeFan", action: "favoritou", anime: "Frieren", time: "8min" },
  { user: "WeebMaster", action: "assistiu EP 12 de", anime: "Solo Leveling", time: "15min" },
  { user: "SergipeOtaku", action: "descobriu", anime: "Vinland Saga", time: "22min" },
];

export default function SocialPage() {
  const { data: trending, isLoading } = useTrending();

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
      <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
        <Users className="text-primary size-7" />
        Social
      </h1>
      <p className="text-muted mt-1 text-sm">
        Comunidade AnimeVerse — o que a galera está assistindo agora.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <GlassPanel className="lg:col-span-2 p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Flame className="text-warning size-5" />
            Atividade recente
          </h2>
          <ul className="mt-4 space-y-3">
            {MOCK_ACTIVITY.map((item) => (
              <li
                key={`${item.user}-${item.anime}`}
                className="border-border flex items-start gap-3 rounded-xl border bg-card/40 p-3"
              >
                <span className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                  {item.user.charAt(0)}
                </span>
                <div>
                  <p className="text-sm">
                    <span className="font-semibold">{item.user}</span>{" "}
                    <span className="text-muted">{item.action}</span>{" "}
                    <span className="font-semibold">{item.anime}</span>
                  </p>
                  <p className="text-muted mt-0.5 text-xs">{item.time} atrás</p>
                </div>
              </li>
            ))}
          </ul>
        </GlassPanel>

        <GlassPanel className="p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <MessageCircle className="text-primary size-5" />
            Discussões em alta
          </h2>
          <ul className="text-muted mt-4 space-y-2 text-sm">
            <li>🔥 Melhor arco de One Piece?</li>
            <li>💬 Dublagem vs Legendado</li>
            <li>⭐ Animes subestimados de 2025</li>
          </ul>
        </GlassPanel>
      </div>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="text-primary size-5" />
          Trending na comunidade
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {isLoading ? (
            <CarouselSkeleton />
          ) : (
            trending?.slice(0, 6).map((anime) => (
              <AnimeCardPremium key={anime.id} anime={anime} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
