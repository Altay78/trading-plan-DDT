"use client";

// Marque DDT en chrome (effet métallique animé via .chrome-text dans globals.css).
// Pass MOTION: au survol (pointeur fin + motion activée), le wordmark gagne un
// micro-lift élastique et un balayage de lumière qui traverse les glyphes,
// intensifiant le chrome. SSR-safe, transform/opacity only, reduced-motion safe.
import { motion, useReducedMotion } from "framer-motion";
import { springSnappy, EASE_SOFT } from "@/lib/motion";

export default function Logo({
  className = "",
  stacked = false,
}: {
  className?: string;
  stacked?: boolean;
}) {
  const reduce = useReducedMotion();

  const content = stacked ? (
    <>
      <span>D</span>
      <span>D</span>
      <span>T</span>
    </>
  ) : (
    "DDT"
  );

  // Reduced motion (or SSR before hydration): render the original plain span,
  // identical markup, no transform, no sweep. Preserves every existing usage.
  if (reduce) {
    return (
      <span
        className={`chrome-text font-extrabold tracking-tight ${
          stacked ? "flex flex-col leading-[0.82]" : ""
        } ${className}`}
        aria-label="DDT"
      >
        {content}
      </span>
    );
  }

  // The light band that races across the glyphs on hover. It is a duplicate of
  // the wordmark, gradient-clipped to the text, so the highlight only paints the
  // letters themselves (not a rectangle). Pure transform + opacity.
  const sweep = (
    <motion.span
      aria-hidden
      className={`pointer-events-none absolute inset-0 select-none font-extrabold tracking-tight ${
        stacked ? "flex flex-col leading-[0.82]" : ""
      }`}
      style={{
        color: "transparent",
        WebkitTextFillColor: "transparent",
        backgroundImage:
          "linear-gradient(105deg, transparent 38%, rgba(213,228,255,0.95) 49%, #ffffff 50%, rgba(213,228,255,0.95) 51%, transparent 62%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        backgroundSize: "260% 100%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "0% 0%",
        // Soft blue bloom so the sweep reads as light, on-theme accent only.
        filter: "drop-shadow(0 0 6px rgba(79,131,255,0.55))",
      }}
      variants={{
        rest: { x: "-9%", opacity: 0 },
        hover: {
          x: "9%",
          opacity: [0, 1, 1, 0],
          transition: {
            x: { duration: 0.62, ease: EASE_SOFT },
            opacity: { duration: 0.62, ease: "easeInOut", times: [0, 0.18, 0.7, 1] },
          },
        },
      }}
    >
      {content}
    </motion.span>
  );

  return (
    <motion.span
      className={`chrome-text relative inline-flex font-extrabold tracking-tight ${
        stacked ? "flex-col leading-[0.82]" : ""
      } ${className}`}
      aria-label="DDT"
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap={{ scale: 0.985 }}
      variants={{
        rest: { scale: 1 },
        hover: { scale: 1.035, transition: springSnappy },
      }}
      // GPU compositing hint; keeps the sweep crisp without layout thrash.
      style={{ willChange: "transform", transformOrigin: "center" }}
    >
      {/* Base glyphs — must carry .chrome-text themselves: the gradient is
          background-clipped to the text, so it has to live on the element that
          holds the glyphs (the parent only inherits a transparent fill color). */}
      <span className={`chrome-text relative ${stacked ? "flex flex-col leading-[0.82]" : ""}`}>
        {content}
      </span>
      {sweep}
    </motion.span>
  );
}
