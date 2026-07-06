"use client";

import { motion } from "framer-motion";
import { revealUp } from "@/utils/animation";
import { cn } from "@/utils/cn";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/** Scroll-reveal section wrapper. */
export function AnimatedSection({
  children,
  className,
  delay = 0,
}: AnimatedSectionProps) {
  return (
    <motion.section
      className={cn(className)}
      variants={revealUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ delay }}
    >
      {children}
    </motion.section>
  );
}
