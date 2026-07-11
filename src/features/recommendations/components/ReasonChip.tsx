"use client";

import { Sparkles } from "lucide-react";
import type { RecommendationReason } from "@/services/apiClient";
import { cn } from "@/utils/cn";

interface ReasonChipProps {
  reasons?: RecommendationReason[];
  className?: string;
}

/**
 * Resolve the single explanation to display for a recommendation.
 *
 * Pure and side-effect free so it can be unit-tested without a DOM: returns the
 * first reason's label, or `null` when there is nothing meaningful to show.
 */
export function primaryReasonLabel(
  reasons?: RecommendationReason[],
): string | null {
  const label = reasons?.[0]?.label?.trim();
  return label ? label : null;
}

/**
 * Purely presentational explainability chip. Renders nothing unless a reason
 * exists, so it is safe to drop into any card without changing existing layout.
 */
export function ReasonChip({ reasons, className }: ReasonChipProps) {
  const label = primaryReasonLabel(reasons);
  if (!label) return null;

  return (
    <span
      title={label}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm",
        className,
      )}
    >
      <Sparkles className="size-3 shrink-0 text-[var(--anime-accent,var(--color-primary))]" />
      <span className="truncate">{label}</span>
    </span>
  );
}
