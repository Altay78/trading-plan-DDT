"use client";

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
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-lg font-semibold tabular-nums">
          {format ? format(value) : value}
        </span>
        <span className="text-xs text-muted">
          {format ? format(min) : min} – {format ? format(max) : max}
        </span>
      </div>
      <input
        type="range"
        className="range"
        style={{ ["--pct" as string]: `${pct}%` }}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
