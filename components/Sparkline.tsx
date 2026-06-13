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

  return (
    <svg width={width} height={height} className="w-full">
      <line
        x1={pad}
        x2={width - pad}
        y1={zeroY}
        y2={zeroY}
        stroke="var(--border)"
        strokeDasharray="3 3"
      />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(series.length - 1)} cy={y(last)} r={3} fill={color} />
    </svg>
  );
}
