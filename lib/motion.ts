/**
 * lib/motion.ts — Shared premium-motion presets for the DDT trading-plan app.
 *
 * Pure data module (no "use client" needed): exports easings, spring presets,
 * and framer-motion Variants for consistent, sober-but-premium motion across
 * every page. Import these instead of redefining transitions inline so the
 * whole app shares one motion language.
 *
 * Theme note: motion only — colors/glows live in CSS. Keep everything animating
 * transform & opacity for performance. Reduced-motion handling is done at the
 * component layer (components/motion.tsx) and in globals.css.
 */
import type { Variants, Transition } from "framer-motion";

/* ============================================================
 * Easings — cubic-bezier tuples, reusable in any `transition.ease`.
 * EASE_OUT matches the app's existing [0.22, 1, 0.36, 1] curve.
 * ============================================================ */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
export const EASE_IN = [0.55, 0, 1, 0.45] as const;
/** Gentle anticipatory ease for soft, expensive-feeling reveals. */
export const EASE_SOFT = [0.16, 1, 0.3, 1] as const;
/** A subtle back-ease (slight overshoot) for playful pops. */
export const EASE_BACK = [0.34, 1.56, 0.64, 1] as const;

/* ============================================================
 * Spring presets — framer-motion Transition objects.
 * Use for interactive elements (knobs, magnetic/tilt, number ticks)
 * where physics feels more alive than a fixed-duration tween.
 * ============================================================ */

/** Smooth, settled, no visible bounce. Good default for UI state changes. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 30,
  mass: 0.9,
};

/** Quick and responsive with a tiny tail. Great for taps, toggles, hovers. */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.7,
};

/** Lively overshoot for celebratory pops (badges, verdicts). Use sparingly. */
export const springBouncy: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 18,
  mass: 0.8,
};

/** Loose, floaty spring for magnetic/tilt return-to-rest. */
export const springGentle: Transition = {
  type: "spring",
  stiffness: 150,
  damping: 20,
  mass: 1,
};

/* ============================================================
 * Duration-based transition shorthands (tweens).
 * ============================================================ */
export const tweenFast: Transition = { duration: 0.22, ease: EASE_OUT };
export const tweenBase: Transition = { duration: 0.4, ease: EASE_OUT };
export const tweenSlow: Transition = { duration: 0.65, ease: EASE_SOFT };

/* ============================================================
 * Variants — hidden/visible pairs for use with initial/animate,
 * whileInView, or as children of a stagger container.
 *
 * All reveals respect the ~0.4s "don't block reading" rule by default.
 * ============================================================ */

/** Fade + rise. The workhorse entrance. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tweenBase,
  },
};

/** Pure opacity fade — no transform. Safe for text-heavy / layout-sensitive areas. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tweenBase },
};

/** Scale-in pop from 96%. Good for cards, badges, modal surfaces. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springSoft,
  },
};

/** Slide in from the left edge. */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: tweenBase },
};

/** Slide in from the right edge. */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: tweenBase },
};

/** Blur + fade + slight rise. The most "premium" reveal — use for hero stats/headings. */
export const blurIn: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: EASE_SOFT },
  },
};

/* ============================================================
 * Stagger helpers.
 * ============================================================ */

/**
 * Container variant that orchestrates a staggered reveal of its children.
 * Pair with `staggerItem` (or any variant whose keys are hidden/visible)
 * on each child. The container itself does not animate visually.
 *
 * @param stagger        delay between each child (seconds)
 * @param delayChildren  delay before the first child starts (seconds)
 */
export function staggerContainer(stagger = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren,
      },
    },
  };
}

/** Child variant for a stagger container: fade + rise. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: tweenBase,
  },
};

/* ============================================================
 * Reduced-motion fallbacks.
 * When prefers-reduced-motion is set, swap any variant for these so the
 * element snaps to its final, fully-opaque, untransformed state.
 * components/motion.tsx uses this automatically.
 * ============================================================ */
export const reducedVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { duration: 0 } },
};

/** Viewport config shared by whileInView reveals: fire once, a little early. */
export const viewportOnce = { once: true, margin: "0px 0px -12% 0px" } as const;
