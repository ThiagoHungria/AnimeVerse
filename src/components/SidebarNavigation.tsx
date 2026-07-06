"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Search,
  Trophy,
  Users,
  Library,
  UserCircle2,
  Settings,
  Play,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { XpIndicator } from "@/features/gamification/components/XpIndicator";

const NAV_ITEMS = [
  { href: "/", label: "Explorar", icon: Compass },
  { href: "/search", label: "Buscar", icon: Search },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/social", label: "Social", icon: Users },
  { href: "/library", label: "Biblioteca", icon: Library },
  { href: "/profile", label: "Perfil", icon: UserCircle2 },
  { href: "/settings", label: "Configurações", icon: Settings },
] as const;

export function SidebarNavigation() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="border-border bg-surface/60 fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col border-r backdrop-blur-xl lg:flex xl:w-56">
      <Link
        href="/"
        className="flex h-16 shrink-0 items-center justify-center gap-2 border-b border-border xl:justify-start xl:px-5"
      >
        <span className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-xl shadow-lg">
          <Play className="size-5 fill-white text-white" />
        </span>
        <span className="hidden text-lg font-extrabold tracking-tight xl:inline">
          Anime<span className="text-brand-gradient">Verse</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              isActive(href)
                ? "bg-white/10 text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                : "text-muted hover:bg-white/5 hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-5 shrink-0 transition-colors",
                isActive(href) && "text-[var(--anime-accent,var(--color-primary))]",
              )}
            />
            <span className="hidden xl:inline">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <XpIndicator />
      </div>
    </aside>
  );
}
