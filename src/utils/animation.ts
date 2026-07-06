import type { Transition, Variants } from "framer-motion";

/** Shared easing curves — cinematic feel. */
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeInOutCubic = [0.65, 0, 0.35, 1] as const;

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export const springSoft: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 28,
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.45, ease: easeOutExpo } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: easeOutExpo },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(4px)",
    transition: { duration: 0.3 },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSoft,
  },
};

export const revealUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOutExpo },
  },
};

export const cardHover3D = {
  rest: { rotateX: 0, rotateY: 0, scale: 1, z: 0 },
  hover: {
    rotateX: -4,
    rotateY: 6,
    scale: 1.03,
    z: 20,
    transition: springSnappy,
  },
};

export const heroKenBurns: Variants = {
  initial: { scale: 1.08, x: 0 },
  animate: {
    scale: 1.15,
    x: -12,
    transition: { duration: 18, ease: "linear", repeat: Infinity, repeatType: "reverse" },
  },
};

export const pulseGlow: Variants = {
  initial: { opacity: 0.4, scale: 1 },
  animate: {
    opacity: [0.35, 0.65, 0.35],
    scale: [1, 1.05, 1],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
  },
};
