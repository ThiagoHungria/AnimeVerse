"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Search, Trophy, Users, Library } from "lucide-react";
import { cn } from "@/utils/cn";

const NAV_ITEMS = [
  { href: "/", label: "Explorar", icon: Compass },
  { href: "/search", label: "Buscar", icon: Search },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/social", label: "Social", icon: Users },
  { href: "/library", label: "Biblioteca", icon: Library },
] as const;

export function MobileNavigation() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="border-border bg-background/90 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
              isActive(href)
                ? "text-[var(--anime-accent,var(--color-primary))]"
                : "text-muted",
            )}
          >
            <Icon className={cn("size-5", isActive(href) && "drop-shadow-[0_0_8px_var(--color-primary)]")} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
