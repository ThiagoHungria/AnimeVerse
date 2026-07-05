import { Star } from "lucide-react";
import { formatRating } from "@/utils/format";
import { cn } from "@/utils/cn";

/** Compact rating chip with a star icon. */
export function RatingBadge({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold backdrop-blur-sm",
        className,
      )}
    >
      <Star className="size-3 fill-warning text-warning" />
      {formatRating(rating)}
    </span>
  );
}
