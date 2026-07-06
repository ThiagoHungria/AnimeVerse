import { cn } from "@/utils/cn";

/** Premium cinematic skeleton with shimmer. */
export function CinematicSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-white/[0.06]",
        className,
      )}
    >
      <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

export function HeroCinematicSkeleton() {
  return (
    <div className="relative h-[68vh] max-h-[640px] min-h-[440px] w-full overflow-hidden md:rounded-b-3xl">
      <CinematicSkeleton className="absolute inset-0 rounded-none" />
      <div className="absolute inset-x-0 bottom-0 space-y-4 px-4 pb-12 md:px-8 md:pb-16">
        <CinematicSkeleton className="h-6 w-32 rounded-full" />
        <CinematicSkeleton className="h-12 w-2/3 max-w-lg" />
        <CinematicSkeleton className="h-4 w-full max-w-xl" />
        <CinematicSkeleton className="h-4 w-4/5 max-w-lg" />
        <div className="flex gap-3 pt-2">
          <CinematicSkeleton className="h-12 w-36 rounded-full" />
          <CinematicSkeleton className="h-12 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CardCinematicSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <CinematicSkeleton className="aspect-[2/3] w-full rounded-xl" />
      <CinematicSkeleton className="mt-3 h-4 w-3/4" />
      <CinematicSkeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}
