"use client";

import { motion } from "framer-motion";
import { pageTransition } from "@/utils/animation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
