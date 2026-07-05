"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Heart,
  Clock,
  Home,
  Menu,
  X,
  Play,
  Compass,
  UserCircle2,
  LogIn,
  LogOut,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";

const NAV_LINKS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/explore", label: "Explorar", icon: Compass },
  { href: "/search", label: "Buscar", icon: Search },
  { href: "/favorites", label: "Favoritos", icon: Heart },
  { href: "/history", label: "Histórico", icon: Clock },
  { href: "/profile", label: "Perfil", icon: UserCircle2 },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
    setOpen(false);
  };

  return (
    <header className="bg-background/80 sticky top-0 z-50 border-b border-border backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-xl shadow-lg">
            <Play className="size-5 fill-white text-white" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            Anime<span className="text-brand-gradient">Verse</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="ml-2 hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-white/10 text-foreground"
                  : "text-muted hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* Search (desktop) */}
        <form onSubmit={handleSearch} className="ml-auto hidden md:block">
          <div className="relative">
            <Search className="text-muted pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar animes..."
              aria-label="Buscar animes"
              className="border-border bg-card focus:border-primary w-56 rounded-full border py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:w-72"
            />
          </div>
        </form>

        {/* Auth (desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          {hydrated && user ? (
            <>
              <span className="text-muted-strong max-w-24 truncate text-sm">
                {user.name.split(" ")[0]}
              </span>
              <button
                type="button"
                onClick={() => logout()}
                aria-label="Sair"
                className="border-border bg-card hover:bg-card-hover flex size-9 items-center justify-center rounded-full border transition-colors"
              >
                <LogOut className="size-4" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="border-border bg-card hover:bg-card-hover inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
            >
              <LogIn className="size-4" /> Entrar
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          className="bg-card hover:bg-card-hover ml-auto flex size-10 items-center justify-center rounded-full md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="animate-fade-in border-t border-border px-4 pb-4 pt-3 md:hidden">
          <form onSubmit={handleSearch} className="mb-3">
            <div className="relative">
              <Search className="text-muted pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar animes..."
                aria-label="Buscar animes"
                className="border-border bg-card focus:border-primary w-full rounded-full border py-2.5 pl-9 pr-4 text-sm outline-none"
              />
            </div>
          </form>
          <div className="grid grid-cols-2 gap-2">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  isActive(href)
                    ? "bg-white/10 text-foreground"
                    : "text-muted bg-card hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
