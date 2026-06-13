"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_SOFT, EASE_OUT, springBouncy } from "@/lib/motion";

// Courbe d'équité en R (cumulé). Inclut la ligne de base 0.
export default function Sparkline({
  data,
  height = 64,
  width = 280,
}: {
  data: number[];
  height?: number;
  width?: number;
}) {
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, "");

  if (data.length < 2) {
    return (
      <div
        style={{ height }}
        className="grid place-items-center text-xs text-muted"
      >
        Pas encore assez de trades pour la courbe
      </div>
    );
  }

  const series = [0, ...data]; // démarre à 0R
  const min = Math.min(0, ...series);
  const max = Math.max(0, ...series);
  const range = max - min || 1;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const x = (i: number) => pad + (i / (series.length - 1)) * w;
  const y = (v: number) => pad + (1 - (v - min) / range) * h;

  const path = series.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const zeroY = y(0);
  const last = series[series.length - 1];
  const up = last >= 0;
  const color = up ? "var(--accent)" : "var(--danger)";

  const lastX = x(series.length - 1);
  const lastY = y(last);

  // Aire sous la courbe : ferme la trajectoire jusqu'à la ligne de base 0
  // pour un dégradé qui se fond vers le fond navy.
  const areaPath = `${path} L ${lastX.toFixed(1)} ${zeroY.toFixed(1)} L ${pad.toFixed(1)} ${zeroY.toFixed(1)} Z`;

  const fillId = `spark-fill-${gid}`;
  const glowId = `spark-glow-${gid}`;

  // Durée de tracé proportionnée : assez vif pour ne pas retarder la lecture,
  // assez lent pour se sentir premium. Capé pour rester sous ~1s.
  const drawDuration = reduce ? 0 : Math.min(1, 0.45 + series.length * 0.03);

  return (
    <svg width={width} height={height} className="w-full overflow-visible">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity={0.55} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Ligne de base 0 — apparaît en fondu, sans déplacement */}
      <motion.line
        x1={pad}
        x2={width - pad}
        y1={zeroY}
        y2={zeroY}
        stroke="var(--border)"
        strokeDasharray="3 3"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
      />

      {/* Aire sous la courbe — se révèle après le tracé de la ligne */}
      <motion.path
        d={areaPath}
        fill={`url(#${fillId})`}
        stroke="none"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.6,
          ease: EASE_SOFT,
          delay: reduce ? 0 : drawDuration * 0.55,
        }}
      />

      {/* Courbe d'équité — tracé progressif via pathLength (transform-safe) */}
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: drawDuration, ease: EASE_SOFT },
          opacity: { duration: 0.2, ease: EASE_OUT },
        }}
      />

      {/* Halo doux pulsant autour du dernier point */}
      {!reduce && (
        <motion.circle
          cx={lastX}
          cy={lastY}
          r={9}
          fill={`url(#${glowId})`}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{
            opacity: [0, 0.9, 0.5, 0.9],
            scale: [0.4, 1, 0.82, 1],
          }}
          style={{ transformOrigin: `${lastX}px ${lastY}px` }}
          transition={{
            opacity: {
              duration: 2.6,
              times: [0, 0.25, 0.6, 1],
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "mirror",
              delay: drawDuration,
            },
            scale: {
              duration: 2.6,
              times: [0, 0.25, 0.6, 1],
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "mirror",
              delay: drawDuration,
            },
          }}
        />
      )}

      {/* Point final — pop d'arrivée une fois le tracé terminé */}
      <motion.circle
        cx={lastX}
        cy={lastY}
        r={3}
        fill={color}
        initial={reduce ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ transformOrigin: `${lastX}px ${lastY}px` }}
        transition={reduce ? undefined : { ...springBouncy, delay: drawDuration }}
      />
    </svg>
  );
}
