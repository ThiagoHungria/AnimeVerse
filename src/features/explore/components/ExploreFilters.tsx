"use client";

import { SlidersHorizontal, X } from "lucide-react";
import type { DiscoverFilters } from "@/services/animeService";
import type { SeasonName } from "@/domain/external";
import { cn } from "@/utils/cn";

interface ExploreFiltersProps {
  filters: DiscoverFilters;
  genres: string[];
  onChange: (next: DiscoverFilters) => void;
  onClear: () => void;
  active: boolean;
}

const SEASONS: { value: SeasonName; label: string }[] = [
  { value: "winter", label: "Inverno" },
  { value: "spring", label: "Primavera" },
  { value: "summer", label: "Verão" },
  { value: "fall", label: "Outono" },
];

const STATUSES: { value: NonNullable<DiscoverFilters["status"]>; label: string }[] =
  [
    { value: "airing", label: "Em lançamento" },
    { value: "complete", label: "Completo" },
    { value: "upcoming", label: "Em breve" },
  ];

const TYPES = ["TV", "Movie", "OVA", "ONA", "Special"];

const SORTS: { value: NonNullable<DiscoverFilters["sort"]>; label: string }[] = [
  { value: "popularity", label: "Popularidade" },
  { value: "score", label: "Nota" },
  { value: "rank", label: "Ranking" },
];

const SCORES = [6, 7, 8, 9];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 26 }, (_, i) => CURRENT_YEAR - i);

/** Advanced discovery filter bar: genre, year, season, score, status, type, sort. */
export function ExploreFilters({
  filters,
  genres,
  onChange,
  onClear,
  active,
}: ExploreFiltersProps) {
  const set = (patch: Partial<DiscoverFilters>) =>
    onChange({ ...filters, ...patch });

  return (
    <div className="border-border bg-surface/40 rounded-2xl border p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="text-primary size-4" /> Filtros
          avançados
        </h2>
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="text-muted hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          >
            <X className="size-3.5" /> Limpar
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Select
          label="Gênero"
          value={filters.genre ?? ""}
          onChange={(v) => set({ genre: v || undefined })}
          options={genres.map((g) => ({ value: g, label: g }))}
        />
        <Select
          label="Ano"
          value={filters.year ? String(filters.year) : ""}
          onChange={(v) => set({ year: v ? Number(v) : undefined })}
          options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
        />
        <Select
          label="Temporada"
          value={filters.season ?? ""}
          onChange={(v) =>
            set({ season: (v || undefined) as SeasonName | undefined })
          }
          options={SEASONS}
          disabled={!filters.year}
          hint={!filters.year ? "Escolha um ano" : undefined}
        />
        <Select
          label="Nota mínima"
          value={filters.minScore ? String(filters.minScore) : ""}
          onChange={(v) => set({ minScore: v ? Number(v) : undefined })}
          options={SCORES.map((s) => ({ value: String(s), label: `${s}+` }))}
        />
        <Select
          label="Status"
          value={filters.status ?? ""}
          onChange={(v) =>
            set({
              status: (v || undefined) as DiscoverFilters["status"],
            })
          }
          options={STATUSES}
        />
        <Select
          label="Tipo"
          value={filters.type ?? ""}
          onChange={(v) => set({ type: v || undefined })}
          options={TYPES.map((t) => ({ value: t, label: t }))}
        />
        <Select
          label="Ordenar por"
          value={filters.sort ?? ""}
          onChange={(v) =>
            set({ sort: (v || undefined) as DiscoverFilters["sort"] })
          }
          options={SORTS}
        />
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted text-xs font-medium">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "border-border bg-card focus:border-primary rounded-lg border px-3 py-2 text-sm outline-none transition-colors",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <option value="">{hint ?? "Todos"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
