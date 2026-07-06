"use client";

import { Bookmark, CheckCircle2, Play } from "lucide-react";
import type { AnimeSummary } from "@/types";
import { useLibraryStore, type LibraryList } from "@/store/library.store";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/utils/cn";

const LISTS: { id: LibraryList; label: string; icon: typeof Play }[] = [
  { id: "watching", label: "Assistindo", icon: Play },
  { id: "planned", label: "Planejado", icon: Bookmark },
  { id: "completed", label: "Completo", icon: CheckCircle2 },
];

export function LibraryButton({ anime }: { anime: AnimeSummary }) {
  const hydrated = useHydrated();
  const addTo = useLibraryStore((s) => s.addTo);
  const removeFrom = useLibraryStore((s) => s.removeFrom);
  const isIn = useLibraryStore((s) => s.isIn);

  if (!hydrated) return null;

  const activeList = LISTS.find((l) => isIn(l.id, anime.id))?.id;

  const handleClick = (list: LibraryList) => {
    if (activeList === list) {
      removeFrom(list, anime.id);
    } else {
      addTo(list, anime);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {LISTS.map(({ id, label, icon: Icon }) => {
        const active = activeList === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => handleClick(id)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-all",
              active
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-white/5 text-muted hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
