"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { springSnappy, springBouncy, springGentle } from "@/lib/motion";

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const reduced = useReducedMotion();

  // Reveal the value bubble while the user interacts (drag / hover / focus)
  // and pop it on grab. Pure presentation — the native input owns the value.
  const [active, setActive] = useState(false); // pressed / dragging
  const [engaged, setEngaged] = useState(false); // hover or focus

  // Spring the fill position so the accent halo that rides under the thumb
  // chases the value with physics instead of snapping. The CSS gradient still
  // owns the literal track fill via --pct; this is a soft glow on top of it.
  const fillPct = useSpring(pct, reduced ? { duration: 0 } : springSnappy);
  useEffect(() => {
    if (reduced) fillPct.jump(pct);
    else fillPct.set(pct);
  }, [pct, reduced, fillPct]);

  // The webkit thumb is 18px; its center is inset by the thumb radius at the
  // extremes, so place the halo at the true thumb center, not raw pct%:
  // half-thumb + pct * (track − thumb).
  const haloLeft = useTransform(
    fillPct,
    (p) => `calc(9px + (100% - 18px) * ${Math.max(0, Math.min(100, p)) / 100})`
  );

  const showBubble = (active || engaged) && !reduced;
  const label = format ? format(value) : value;
  const thumbLeft = `calc(9px + (100% - 18px) * ${pct / 100})`;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <motion.span
          className="text-lg font-semibold tabular-nums"
          animate={
            reduced
              ? undefined
              : { scale: active ? 1.06 : 1, color: active ? "#4f83ff" : "#f1f4fb" }
          }
          transition={springSnappy}
          style={{ display: "inline-block", transformOrigin: "left center" }}
        >
          {label}
        </motion.span>
        <span className="text-xs text-muted">
          {format ? format(min) : min} – {format ? format(max) : max}
        </span>
      </div>

      <div className="relative">
        {/* Floating value bubble that tracks the thumb and pops on grab. */}
        <AnimatePresence>
          {showBubble && (
            <motion.div
              key="bubble"
              className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold tabular-nums"
              style={{
                left: thumbLeft,
                bottom: "calc(100% + 6px)",
                background: "#16213f",
                color: "#f1f4fb",
                border: "1px solid #243156",
                boxShadow:
                  "0 6px 18px rgba(0,0,0,0.45), 0 0 14px rgba(79,131,255,0.28)",
              }}
              initial={{ opacity: 0, y: 6, scale: 0.82 }}
              animate={{ opacity: 1, y: 0, scale: active ? 1.06 : 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.86 }}
              transition={active ? springBouncy : springGentle}
            >
              {label}
              {/* Little pointer aimed at the thumb. */}
              <span
                aria-hidden
                className="absolute left-1/2 top-full -translate-x-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "5px solid #16213f",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Soft accent halo riding the spring-eased fill end (transform-only). */}
        {!reduced && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute z-0 -translate-x-1/2 rounded-full"
            style={{
              top: "50%",
              marginTop: -7,
              left: haloLeft,
              width: 14,
              height: 14,
              background:
                "radial-gradient(circle, rgba(79,131,255,0.55) 0%, rgba(79,131,255,0) 70%)",
            }}
            animate={{
              scale: active ? 2.1 : engaged ? 1.5 : 1,
              opacity: active ? 1 : engaged ? 0.8 : 0,
            }}
            transition={springSnappy}
          />
        )}

        <input
          type="range"
          className="range relative z-[1]"
          style={{ ["--pct" as string]: `${pct}%` }}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={() => setActive(true)}
          onPointerUp={() => setActive(false)}
          onPointerCancel={() => setActive(false)}
          onPointerEnter={() => setEngaged(true)}
          onPointerLeave={() => setEngaged(false)}
          onFocus={() => setEngaged(true)}
          onBlur={() => {
            setEngaged(false);
            setActive(false);
          }}
        />
      </div>
    </div>
  );
}
