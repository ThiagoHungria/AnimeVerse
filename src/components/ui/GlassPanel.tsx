import { cn } from "@/utils/cn";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  /** Use anime dynamic CSS vars when inside themed page. */
  tinted?: boolean;
}

export function GlassPanel({ children, className, tinted }: GlassPanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl",
        tinted && "border-[color-mix(in_srgb,var(--anime-primary)_40%,transparent)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
