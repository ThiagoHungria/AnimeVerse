import { Skeleton } from "./Skeleton";
import { cn } from "@/utils/cn";

/** Skeleton matching the AnimeCard footprint. */
export function AnimeCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <Skeleton className="aspect-[2/3] w-full rounded-xl" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}

/** A horizontal row of card skeletons (matches a carousel). */
export function CarouselSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <AnimeCardSkeleton key={i} className="w-40 shrink-0 md:w-48" />
      ))}
    </div>
  );
}

/** A responsive grid of card skeletons (matches search/favorites). */
export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <AnimeCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Full-bleed hero skeleton for the Home page. */
export function HeroSkeleton() {
  return (
    <Skeleton className="h-[60vh] max-h-[560px] min-h-[380px] w-full rounded-none md:rounded-b-3xl" />
  );
}
