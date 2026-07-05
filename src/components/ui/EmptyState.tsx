import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}

/** Friendly empty state for favorites, history, search-with-no-results, etc. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-surface/50 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="bg-brand-gradient/10 flex size-16 items-center justify-center rounded-2xl border border-border-strong">
        <Icon className="text-primary size-8" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-muted mx-auto max-w-sm text-sm">{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="bg-brand-gradient mt-1 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
