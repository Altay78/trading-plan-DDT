"use client";

/**
 * components/motion.tsx — Premium-motion component library for the DDT app.
 *
 * Client components built on framer-motion v12. Every component:
 *   - is SSR-safe (guards window / matchMedia / pointer queries),
 *   - degrades gracefully under prefers-reduced-motion (no transform, full
 *     opacity, instant final state),
 *   - animates transform & opacity only where possible.
 *
 * Theme: motion only. Colors come from CSS variables / Tailwind classes.
 * Accent is blue (var(--accent)). Do not introduce non-blue accents here.
 */

import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
  type Transition,
  type HTMLMotionProps,
  type MotionProps,
} from "framer-motion";
import {
  createElement,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ComponentType,
  type ElementType,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  EASE_OUT,
  springGentle,
  springSnappy,
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "@/lib/motion";

/* ============================================================
 * Internal: a stable `Motion` dispatch component.
 *
 * `motion(tag)` / `motion.create(tag)` must NOT run during render — each call
 * makes a brand-new component that resets state. We pre-build the common
 * semantic tags once at module scope and cache any others lazily, then render
 * through this single module-level <Motion as=…/> component so no
 * component is ever created during a parent's render.
 * ============================================================ */
type AnyMotion = ComponentType<MotionProps & { className?: string; style?: CSSProperties }>;

const MOTION_TAGS: Record<string, AnyMotion> = {
  div: motion.div as AnyMotion,
  section: motion.section as AnyMotion,
  article: motion.article as AnyMotion,
  ul: motion.ul as AnyMotion,
  ol: motion.ol as AnyMotion,
  li: motion.li as AnyMotion,
  span: motion.span as AnyMotion,
  p: motion.p as AnyMotion,
  header: motion.header as AnyMotion,
  footer: motion.footer as AnyMotion,
  h1: motion.h1 as AnyMotion,
  h2: motion.h2 as AnyMotion,
  h3: motion.h3 as AnyMotion,
};

const lazyMotionCache = new Map<ElementType, AnyMotion>();

function resolveMotion(tag: ElementType): AnyMotion {
  if (typeof tag === "string" && MOTION_TAGS[tag]) return MOTION_TAGS[tag];
  const cached = lazyMotionCache.get(tag);
  if (cached) return cached;
  const created = motion.create(tag as keyof typeof motion) as unknown as AnyMotion;
  lazyMotionCache.set(tag, created);
  return created;
}

type MotionDispatchProps = MotionProps & {
  as: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/** Module-level dispatcher: picks the right motion.<tag> and forwards props.
 *  Uses createElement so no capitalized component is bound during render. */
function Motion({ as, children, ...rest }: MotionDispatchProps) {
  return createElement(resolveMotion(as), rest, children);
}

/* ============================================================
 * Internal hook: is this a fine (mouse) pointer?
 * Used to disable cursor-driven effects on touch devices.
 * SSR-safe: returns false until mounted (so first paint matches server).
 * ============================================================ */
function useFinePointer(): boolean {
  // Subscribe to the media query; useSyncExternalStore keeps SSR (false) and
  // client in sync without a synchronous setState inside an effect.
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mq = window.matchMedia("(pointer: fine)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () =>
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(pointer: fine)").matches
        : false,
    () => false, // server snapshot
  );
}

/* ============================================================
 * Reveal — fade + rise into view on scroll (whileInView, once).
 * No-ops under reduced motion (renders final state, no transform).
 * ============================================================ */
export type RevealProps = {
  children: ReactNode;
  /** Stagger/sequence delay in seconds. */
  delay?: number;
  /** Initial vertical offset in px (default 16). */
  y?: number;
  className?: string;
  /** Element/component to render as (default "div"). */
  as?: ElementType;
  style?: CSSProperties;
};

export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
  as = "div",
  style,
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Tag = as as ElementType;
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  return (
    <Motion
      as={as}
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.5, ease: EASE_OUT, delay }}
    >
      {children}
    </Motion>
  );
}

/* ============================================================
 * Stagger + StaggerChild — orchestrated cascade.
 * Container reveals its StaggerChild children one after another when it
 * scrolls into view. Reduced motion → renders children statically.
 * ============================================================ */
export type StaggerProps = {
  children: ReactNode;
  className?: string;
  /** Delay between children (seconds, default 0.06). */
  stagger?: number;
  /** Delay before the first child (seconds, default 0). */
  delayChildren?: number;
  as?: ElementType;
  style?: CSSProperties;
};

export function Stagger({
  children,
  className,
  stagger = 0.06,
  delayChildren = 0,
  as = "div",
  style,
}: StaggerProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Tag = as as ElementType;
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  return (
    <Motion
      as={as}
      className={className}
      style={style}
      variants={staggerContainer(stagger, delayChildren)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      {children}
    </Motion>
  );
}

export type StaggerChildProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  style?: CSSProperties;
};

export function StaggerChild({
  children,
  className,
  as = "div",
  style,
}: StaggerChildProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Tag = as as ElementType;
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  return (
    <Motion as={as} className={className} style={style} variants={staggerItem}>
      {children}
    </Motion>
  );
}

/* ============================================================
 * AnimatedNumber — smoothly tweens to a new value on change.
 * Money / percent stats should tick. Reduced motion → instant value.
 * Formats with fixed decimals; supports prefix/suffix.
 * ============================================================ */
export type AnimatedNumberProps = {
  value: number;
  /** Decimal places (default 0). */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Tween duration in ms (default 700). */
  durationMs?: number;
  className?: string;
  /** Locale for grouping; default "fr-FR" (app is French). Pass "" to skip grouping. */
  locale?: string;
};

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  durationMs = 700,
  className,
  locale = "fr-FR",
}: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const prev = useRef(value);

  const format = (n: number) => {
    const safe = Number.isFinite(n) ? n : 0;
    if (locale) {
      return safe.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return safe.toFixed(decimals);
  };

  // Derived, formatted string motion value — drives a <motion.span>'s text
  // node directly. No React state is set inside the effect, so there is no
  // cascading render and SSR output (the formatted initial value) is stable.
  const text = useTransform(mv, (latest) => format(latest));

  useEffect(() => {
    // Snap (no count-up) on the very first run and under reduced motion.
    if (prev.current === value) return;
    if (reduce) {
      mv.set(value);
      prev.current = value;
      return;
    }
    const controls = animate(mv, value, {
      duration: durationMs / 1000,
      ease: EASE_OUT,
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce, durationMs, mv]);

  return (
    <span className={className}>
      {prefix}
      <motion.span>{text}</motion.span>
      {suffix}
    </span>
  );
}

/* ============================================================
 * MagneticButton — subtly pulls toward the cursor on hover.
 * Fine pointer only; disabled on touch & reduced motion (renders a plain
 * <button> with identical props). Translate is capped to a few px.
 * ============================================================ */
type ButtonMotionProps = HTMLMotionProps<"button">;
export type MagneticButtonProps = Omit<
  ButtonMotionProps,
  "ref" | "onDrag" | "onDragEnd" | "onDragStart"
> & {
  children: ReactNode;
  /** Max pull distance in px (default 6). */
  strength?: number;
};

export function MagneticButton({
  children,
  className,
  strength = 6,
  ...props
}: MagneticButtonProps) {
  const reduce = useReducedMotion();
  const fine = useFinePointer();
  const ref = useRef<HTMLButtonElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, springGentle);
  const sy = useSpring(y, springGentle);

  const enabled = fine && !reduce;

  const handleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    // Normalize by half-size, clamp to [-1, 1], scale by strength.
    const nx = Math.max(-1, Math.min(1, relX / (rect.width / 2)));
    const ny = Math.max(-1, Math.min(1, relY / (rect.height / 2)));
    x.set(nx * strength);
    y.set(ny * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      className={className}
      style={enabled ? { x: sx, y: sy } : undefined}
      onPointerMove={enabled ? handleMove : undefined}
      onPointerLeave={enabled ? reset : undefined}
      whileTap={enabled ? { scale: 0.97 } : undefined}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/* ============================================================
 * TiltCard — 3D tilt toward the cursor on pointer move.
 * Subtle (max ~6deg), springs back on leave. Coarse-pointer /
 * reduced-motion safe (renders a static div).
 * ============================================================ */
export type TiltCardProps = {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees (default 6). */
  max?: number;
  /** Perspective in px (default 900). */
  perspective?: number;
  style?: CSSProperties;
  onClick?: () => void;
};

export function TiltCard({
  children,
  className,
  max = 6,
  perspective = 900,
  style,
  onClick,
}: TiltCardProps) {
  const reduce = useReducedMotion();
  const fine = useFinePointer();
  const ref = useRef<HTMLDivElement>(null);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const springCfg: Transition = springSnappy;
  const srx = useSpring(rx, springCfg);
  const sry = useSpring(ry, springCfg);

  const enabled = fine && !reduce;

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    // Top → +rotateX (tilts toward viewer), left → -rotateY.
    rx.set((0.5 - py) * max * 2);
    ry.set((px - 0.5) * max * 2);
  };

  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  if (!enabled) {
    return (
      <div className={className} style={style} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      onClick={onClick}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      style={{
        ...style,
        rotateX: srx,
        rotateY: sry,
        transformPerspective: perspective,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
 * GradientBorder — animated rotating conic accent border around content.
 * Content sits on the surface; the border is the blue accent sweeping round.
 * Reduced motion → static border (no rotation).
 * ============================================================ */
export type GradientBorderProps = {
  children: ReactNode;
  className?: string;
  /** Border thickness in px (default 1). */
  thickness?: number;
  /** Corner radius in px (default 16, matches .card). */
  radius?: number;
  /** Rotation period in seconds (default 6). */
  durationSec?: number;
  /** Inner surface className (default surface bg). */
  innerClassName?: string;
  style?: CSSProperties;
};

export function GradientBorder({
  children,
  className,
  thickness = 1,
  radius = 16,
  durationSec = 6,
  innerClassName = "bg-surface",
  style,
}: GradientBorderProps) {
  const reduce = useReducedMotion();

  // The conic gradient lives on a child so we can rotate just the paint.
  const conic =
    "conic-gradient(from 0deg, transparent 0%, rgba(79,131,255,0.05) 18%, rgba(79,131,255,0.85) 42%, #4f83ff 50%, rgba(79,131,255,0.85) 58%, rgba(79,131,255,0.05) 82%, transparent 100%)";

  return (
    <div
      className={className}
      style={{
        position: "relative",
        borderRadius: radius,
        padding: thickness,
        overflow: "hidden",
        isolation: "isolate",
        ...style,
      }}
    >
      {/* Rotating paint layer (or static ring under reduced motion) */}
      {reduce ? (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            background: "rgba(79,131,255,0.4)",
            zIndex: 0,
          }}
        />
      ) : (
        <motion.span
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "200%",
            height: "200%",
            translateX: "-50%",
            translateY: "-50%",
            background: conic,
            zIndex: 0,
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: durationSec,
            ease: "linear",
            repeat: Infinity,
          }}
        />
      )}
      {/* Inner surface holding the real content */}
      <div
        className={innerClassName}
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: Math.max(0, radius - thickness),
          height: "100%",
          width: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ============================================================
 * Shine — diagonal light sweep overlay. Drop into a relative-positioned
 * card/button. One-shot (default) or looping. Reduced motion → renders
 * nothing.
 * ============================================================ */
export type ShineProps = {
  /** Loop forever instead of a single pass (default false). */
  loop?: boolean;
  /** Sweep duration in seconds (default 1.1). */
  durationSec?: number;
  /** Delay before the (first) sweep in seconds (default 0.2). */
  delaySec?: number;
  className?: string;
  /** Corner radius in px to clip the sweep (default 16). */
  radius?: number;
};

export function Shine({
  loop = false,
  durationSec = 1.1,
  delaySec = 0.2,
  className,
  radius = 16,
}: ShineProps) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <motion.span
      aria-hidden
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 2,
      }}
    >
      <motion.span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: "45%",
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)",
          transform: "skewX(-18deg)",
        }}
        initial={{ x: "-160%" }}
        animate={{ x: "320%" }}
        transition={{
          duration: durationSec,
          ease: EASE_OUT,
          delay: delaySec,
          repeat: loop ? Infinity : 0,
          repeatDelay: loop ? 1.8 : 0,
        }}
      />
    </motion.span>
  );
}
