import { cn } from "@/utils/cn";

/** Base shimmer block used to compose loading states. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-card relative overflow-hidden rounded-md",
        "after:absolute after:inset-0 after:-translate-x-full",
        "after:bg-gradient-to-r after:from-transparent after:via-white/5 after:to-transparent",
        "after:[animation:shimmer_1.6s_infinite]",
        className,
      )}
    />
  );
}
