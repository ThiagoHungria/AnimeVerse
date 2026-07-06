"use client";

import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { staggerContainer, staggerItem } from "@/utils/animation";

/** Renders intelligence-layer smart tags as animated gradient pills. */
export function SmartTags({
  tags,
  max = 3,
  withIcon = false,
  animated = false,
  className,
}: {
  tags: string[];
  max?: number;
  withIcon?: boolean;
  animated?: boolean;
  className?: string;
}) {
  if (!tags || tags.length === 0) return null;

  const slice = tags.slice(0, max);
  const Wrapper = animated ? motion.div : "div";
  const wrapperProps = animated
    ? {
        variants: staggerContainer,
        initial: "hidden" as const,
        animate: "visible" as const,
      }
    : {};

  return (
    <Wrapper
      className={cn("flex flex-wrap gap-1.5", className)}
      {...wrapperProps}
    >
      {slice.map((tag) => {
        const inner = (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm",
              animated
                ? "border-[color-mix(in_srgb,var(--anime-accent)_50%,transparent)] bg-[color-mix(in_srgb,var(--anime-primary)_25%,transparent)] text-white"
                : "border-primary/30 bg-primary/10 text-primary",
            )}
          >
            {withIcon && <Sparkles className="size-3" />}
            {tag}
          </span>
        );

        if (!animated) {
          return <span key={tag}>{inner}</span>;
        }

        return (
          <motion.span key={tag} variants={staggerItem}>
            {inner}
          </motion.span>
        );
      })}
    </Wrapper>
  );
}
