"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const easePremium = [0.16, 1, 0.3, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  blur?: boolean;
};

/**
 * Fades/slides content into view once as it enters the viewport (scroll
 * storytelling). Disabled entirely under prefers-reduced-motion. GPU-only
 * properties (opacity/transform/filter), no layout impact, fires once.
 */
export function Reveal({ children, className, delay = 0, y = 24, blur = false }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const variants: Variants = {
    hidden: { opacity: 0, y, filter: blur ? "blur(8px)" : "blur(0px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      variants={variants}
      transition={{ duration: 0.7, delay, ease: easePremium }}
    >
      {children}
    </motion.div>
  );
}
