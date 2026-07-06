"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogIn, LogOut, Play, Search, UserCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";
import { useGamificationStore } from "@/store/gamification.store";
import { levelFromXp, levelTitle } from "@/domain/gamification";

export function AppHeader() {
  const router = useRouter();
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const xp = useGamificationStore((s) => s.xp);
  const level = levelFromXp(xp);

  return (
    <header className="border-border bg-background/70 sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b px-4 backdrop-blur-xl md:px-6 lg:px-8">
      <Link href="/" className="flex items-center gap-2 lg:hidden">
        <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg">
          <Play className="size-4 fill-white text-white" />
        </span>
        <span className="font-extrabold tracking-tight">
          Anime<span className="text-brand-gradient">Verse</span>
        </span>
      </Link>

      <button
        type="button"
        onClick={() => router.push("/search")}
        className="border-border bg-card/60 text-muted hover:text-foreground hidden max-w-md flex-1 items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors md:flex lg:max-w-sm"
      >
        <Search className="size-4" />
        Buscar animes...
      </button>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <button
          type="button"
          aria-label="Notificações"
          className="border-border bg-card/60 hover:bg-card-hover flex size-9 items-center justify-center rounded-full border transition-colors"
        >
          <Bell className="size-4" />
        </button>

        {hydrated && user ? (
          <>
            <Link
              href="/profile"
              className="border-border bg-card/60 hover:bg-card-hover hidden items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-colors sm:flex"
            >
              <span className="bg-brand-gradient flex size-7 items-center justify-center rounded-full text-xs font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-24 truncate text-sm font-medium">
                {user.name.split(" ")[0]}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              aria-label="Sair"
              className="border-border bg-card/60 hover:bg-card-hover flex size-9 items-center justify-center rounded-full border transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="border-border bg-card/60 hover:bg-card-hover inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <LogIn className="size-4" />
            <span className="hidden sm:inline">Entrar</span>
          </Link>
        )}

        <Link
          href="/profile"
          className="border-border bg-card/60 hover:bg-card-hover flex size-9 items-center justify-center rounded-full border transition-colors sm:hidden"
          aria-label={`Perfil — ${levelTitle(level)}`}
        >
          <UserCircle2 className="size-4" />
        </Link>
      </div>
    </header>
  );
}
