"use client";

import { motion } from "framer-motion";
import type { AnimePalette } from "@/utils/colorSystem";
import { pulseGlow } from "@/utils/animation";

interface DynamicBackgroundProps {
  palette: AnimePalette;
  className?: string;
}

/** Ambient glow + gradient backdrop driven by anime palette. */
export function DynamicBackground({ palette, className }: DynamicBackgroundProps) {
  return (
    <div className={className} aria-hidden>
      <div
        className="absolute inset-0 opacity-40"
        style={{ background: palette.gradient, mixBlendMode: "multiply" }}
      />
      <motion.div
        className="pointer-events-none absolute -left-1/4 top-0 size-[60vw] max-w-[600px] rounded-full blur-[120px]"
        style={{ background: palette.primary }}
        variants={pulseGlow}
        initial="initial"
        animate="animate"
      />
      <motion.div
        className="pointer-events-none absolute -right-1/4 bottom-0 size-[50vw] max-w-[500px] rounded-full blur-[100px]"
        style={{ background: palette.accent }}
        variants={pulseGlow}
        initial="initial"
        animate="animate"
      />
      <div className="from-background via-background/80 absolute inset-0 bg-gradient-to-b to-transparent" />
    </div>
  );
}
