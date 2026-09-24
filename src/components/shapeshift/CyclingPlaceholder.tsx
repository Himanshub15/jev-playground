"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { tween } from "@/lib/motion";

const EXAMPLES = [
  "team standup monday 10am",
  "buy coffee, batteries and limes",
  "45 min deep work",
  "a deep ocean blue",
  "split $186 dinner between 4",
  "35000 feet in meters",
  "flight to tokyo in march",
  "tacos or ramen for lunch?",
  "days until new year",
  "9am cst in tokyo",
  "flip a coin",
  "pale sky blue",
];

export function CyclingPlaceholder() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    // Auto-rotating text is autoplay: reduced motion keeps the first example still.
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % EXAMPLES.length), 2800);
    return () => clearInterval(id);
  }, [reduce]);
  return (
    <span aria-hidden className="pointer-events-none absolute inset-y-0 start-5 end-5 flex items-center overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.span
          key={i}
          className="absolute truncate text-[22px] leading-8 font-[450] tracking-[-0.01em] text-muted-foreground"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={reduce ? tween.fade : tween.crossfade}
        >
          {EXAMPLES[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
