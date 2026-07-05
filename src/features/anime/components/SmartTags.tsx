import { Sparkles } from "lucide-react";
import { cn } from "@/utils/cn";

/** Renders the intelligence-layer smart tags as subtle gradient pills. */
export function SmartTags({
  tags,
  max = 3,
  withIcon = false,
  className,
}: {
  tags: string[];
  max?: number;
  withIcon?: boolean;
  className?: string;
}) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.slice(0, max).map((tag) => (
        <span
          key={tag}
          className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
        >
          {withIcon && <Sparkles className="size-3" />}
          {tag}
        </span>
      ))}
    </div>
  );
}
