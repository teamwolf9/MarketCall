"use client";

import { motion, type Variants } from "motion/react";

/**
 * Blur-up entrance — content lifts in with a soft blur, optionally staggered.
 * The signature motion of the landing aesthetic; reused so timing stays
 * consistent. Respects reduced-motion via the CSS media query on the parent.
 */
const item: Variants = {
  hidden: { opacity: 0, filter: "blur(12px)", y: 12 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: { type: "spring", bounce: 0.3, duration: 1.4 },
  },
};

/** Stagger a group of children in. Each direct child should be an <AnimatedItem>. */
export function AnimatedGroup({
  children,
  className,
  delay = 0,
  stagger = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: { staggerChildren: stagger, delayChildren: delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/** One blur-up element. Use inside <AnimatedGroup>, or standalone for a single lift. */
export function AnimatedItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
