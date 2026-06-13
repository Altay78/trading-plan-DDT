"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { springSnappy, springBouncy } from "@/lib/motion";

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        className="input num-input"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step ?? "any"}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  tone = "accent",
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "accent" | "danger";
  disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  const activeCls =
    tone === "danger"
      ? "border-danger bg-danger/15 text-danger"
      : "border-accent bg-accent/15 text-accent";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={reduce || disabled ? undefined : { scale: 0.95 }}
      animate={reduce ? undefined : { scale: active ? 1.04 : 1 }}
      transition={springSnappy}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? activeCls : "border-border bg-surface-2 text-muted hover:text-foreground"
      } ${disabled ? "cursor-not-allowed opacity-35 hover:text-muted" : ""}`}
    >
      {children}
    </motion.button>
  );
}

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-surface-2 border border-border"
      }`}
    >
      <motion.span
        className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 24 : 4 }}
        transition={reduce ? { duration: 0 } : springSnappy}
      />
    </button>
  );
}

export function Badge({
  tone,
  children,
}: {
  tone: "ok" | "fail" | "warn" | "muted";
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const cls = {
    ok: "bg-accent/15 text-accent",
    fail: "bg-danger/15 text-danger",
    warn: "bg-warning/15 text-warning",
    muted: "bg-surface-2 text-muted",
  }[tone];
  return (
    <motion.span
      // `initial={false}`-friendly: animate from the same opacity SSR renders,
      // so first paint matches and there is no hydration flash.
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduce ? { duration: 0 } : springBouncy}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {children}
    </motion.span>
  );
}
