"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePlan } from "@/lib/usePlan";
import {
  classifyRiskProfile,
  recommendWithdrawal,
  simulateForecast,
  type Forecast as ForecastResult,
} from "@/lib/calc";
import {
  SESSIONS,
  WITHDRAWAL_STRATEGIES,
  type TradingPlan,
  type WithdrawalStrategy,
} from "@/lib/plan";
import { Badge, NumberInput } from "@/components/ui";
import { Slider } from "@/components/Slider";

const FORECAST_DAYS = 30;
type UpdateFn = <K extends keyof TradingPlan>(k: K, v: TradingPlan[K]) => void;

const fmtMoney = (n: number, currency: string) =>
  `${Math.round(n).toLocaleString("fr-FR")} ${currency}`;

export default function Home() {
  const { plan, loaded, exists, update } = usePlan();
  const fc = useMemo(
    () => simulateForecast(plan, plan.expectedWinRate, FORECAST_DAYS),
    [plan],
  );

  return (
    <div className="space-y-8 animate-stagger">
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Discipline &gt; prédiction
          </div>
          <h1 className="mt-3 max-w-2xl text-2xl font-semibold sm:text-3xl">
            Construis ton plan, puis valide chaque trade avant d&apos;entrer.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Tu définis tes règles une fois. Ensuite, chaque trade passe par un check qui le
            valide ✅ ou le bloque ⛔ — avec les raisons.
          </p>
        </div>
      </section>

      {loaded &&
        (exists ? (
          <>
            <PlanReminders plan={plan} />
            <Forecast plan={plan} update={update} fc={fc} />
            <Withdrawal plan={plan} update={update} fc={fc} />
          </>
        ) : (
          <UrgentCTA />
        ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/trade" className="card card-hover group p-5 transition hover:border-accent/50">
          <div className="text-sm font-semibold">Check pré-trade</div>
          <p className="mt-1 text-sm text-muted">
            Avant d&apos;entrer : actif, session, état psycho, news, confirmations, niveaux.
            Donne le verdict + ta taille de position.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-accent">Vérifier un trade →</div>
        </Link>
        <Link href="/journal" className="card card-hover group p-5 transition hover:border-accent/50">
          <div className="text-sm font-semibold">Journal</div>
          <p className="mt-1 text-sm text-muted">
            Logge tes trades, mesure ton respect du plan, ton win rate et ta performance en R.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-accent">Ouvrir le journal →</div>
        </Link>
      </div>
    </div>
  );
}

function UrgentCTA() {
  return (
    <section className="card border-warning/40 bg-warning/5 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/15 text-xl text-warning">
          ⚠
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Tu n&apos;as pas encore de plan de trading</h2>
          <p className="mt-1 text-sm text-muted">
            Sans plan, pas de discipline — et pas de trade. Définis tes règles (money
            management, psycho, confirmations) en quelques minutes.
          </p>
          <Link
            href="/plan"
            className="btn-primary mt-4 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Créer mon plan maintenant →
          </Link>
        </div>
      </div>
    </section>
  );
}

function PlanReminders({ plan }: { plan: TradingPlan }) {
  const profile = classifyRiskProfile(plan);
  const assets = plan.assets.filter(Boolean);
  const sessions = SESSIONS.filter((s) => plan.sessions.includes(s.key)).map((s) => s.label);

  const rules = [
    { label: "Risque / trade", value: `${plan.riskPerTradePct}%` },
    { label: "RR minimum", value: `${plan.minRiskReward}` },
    { label: "Confirmations", value: `${plan.minConfluences} min` },
    { label: "Perte max / jour", value: `-${plan.maxDailyLossPct}%` },
    { label: "Perte max / sem.", value: `-${plan.maxWeeklyLossPct}%` },
    { label: "Trades / jour", value: `${plan.maxTradesPerDay} max` },
    { label: "Risque ouvert", value: `${plan.maxOpenRiskPct}% max` },
    { label: "Kill-switch", value: `-${plan.maxAccountDrawdownPct}%` },
  ];

  return (
    <section className="card p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-accent">Rappels — ton plan</p>
          <h2 className="mt-1 text-lg font-semibold">{plan.memberName || "Money management"}</h2>
        </div>
        <Badge tone={profile.tone}>Profil {profile.label}</Badge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
        {rules.map((r) => (
          <div key={r.label}>
            <div className="text-xs text-muted">{r.label}</div>
            <div className="mt-0.5 text-sm font-semibold">{r.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <span className="text-xs text-muted">Actifs :</span>
        {assets.length ? (
          assets.map((a) => (
            <span key={a} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium">{a}</span>
          ))
        ) : (
          <span className="text-xs text-muted">aucun</span>
        )}
        {plan.watchIndices.length > 0 && (
          <>
            <span className="ml-2 text-xs text-muted">Indices :</span>
            {plan.watchIndices.map((i) => (
              <span key={i} className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">{i}</span>
            ))}
          </>
        )}
        {sessions.length > 0 && (
          <>
            <span className="ml-2 text-xs text-muted">Sessions :</span>
            <span className="text-xs">{sessions.join(", ")}</span>
          </>
        )}
        <Link href="/plan" className="ml-auto text-xs font-medium text-accent hover:underline">
          Modifier →
        </Link>
      </div>
    </section>
  );
}

function Forecast({
  plan,
  update,
  fc,
}: {
  plan: TradingPlan;
  update: UpdateFn;
  fc: ForecastResult;
}) {
  const up = fc.pnl >= 0;

  return (
    <section className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Forecast — 30 jours</h2>
          <p className="mt-1 text-sm text-muted">
            Projection réaliste avec gains et pertes, à risque composé. Joue sur le win rate.
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-semibold ${up ? "text-accent" : "text-danger"}`}>
            {fmtMoney(fc.finalCapital, plan.currency)}
          </div>
          <div className={`text-xs ${up ? "text-accent" : "text-danger"}`}>
            {up ? "+" : "−"}
            {fmtMoney(Math.abs(fc.pnl), plan.currency)} · {up ? "+" : "−"}
            {Math.abs(fc.pnlPct).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="mt-5 max-w-sm">
        <div className="mb-1 text-sm font-medium">Win rate attendu</div>
        <Slider
          value={plan.expectedWinRate}
          min={30}
          max={80}
          step={1}
          format={(v) => `${v}%`}
          onChange={(v) => update("expectedWinRate", v)}
        />
      </div>

      <div className="mt-5">
        <ForecastChart fc={fc} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="Trades gagnants" value={`${fc.wins}`} tone="ok" />
        <Mini label="Trades perdants" value={`${fc.losses}`} tone="fail" />
        <Mini label="Drawdown max" value={`-${fc.maxDrawdownPct.toFixed(1)}%`} tone="fail" />
        <Mini label="Win rate" value={`${plan.expectedWinRate}%`} />
      </div>
      <p className="mt-3 text-xs text-muted">
        Capital de départ {fmtMoney(fc.start, plan.currency)}. Séquence simulée — l&apos;ordre
        réel des gains/pertes varie, mais le résultat attendu est cohérent.
      </p>
    </section>
  );
}

function ForecastChart({ fc }: { fc: ReturnType<typeof simulateForecast> }) {
  const W = 600;
  const H = 170;
  const pad = 10;
  const eqTop = 10;
  const eqBottom = 112;
  const barCenter = 150;
  const barMax = 22;

  const caps = [fc.start, ...fc.days.map((d) => d.capital)];
  const minCap = Math.min(...caps);
  const maxCap = Math.max(...caps);
  const capRange = maxCap - minCap || 1;
  const n = caps.length;
  const x = (i: number) => pad + (i / (n - 1)) * (W - 2 * pad);
  const yEq = (v: number) => eqBottom - ((v - minCap) / capRange) * (eqBottom - eqTop);

  const line = caps.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${yEq(v).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(n - 1).toFixed(1)} ${eqBottom} L ${x(0).toFixed(1)} ${eqBottom} Z`;
  const up = fc.pnl >= 0;
  const stroke = up ? "var(--accent)" : "var(--danger)";

  const maxAbsPnl = Math.max(...fc.days.map((d) => Math.abs(d.pnl)), 1);
  const barW = ((W - 2 * pad) / fc.days.length) * 0.55;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fcArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* ligne de capital de départ */}
      <line x1={pad} x2={W - pad} y1={yEq(fc.start)} y2={yEq(fc.start)} stroke="var(--border)" strokeDasharray="3 4" />
      <path className="fc-area" d={area} fill="url(#fcArea)" />
      <path
        className="fc-line"
        pathLength={1}
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle className="fc-dot" cx={x(n - 1)} cy={yEq(caps[n - 1])} r={3.5} fill={stroke} />
      {/* barres P&L par jour (gains verts / pertes rouges) */}
      {fc.days.map((d, i) => {
        const h = (Math.abs(d.pnl) / maxAbsPnl) * barMax;
        const cx = x(i + 1);
        const y = d.win ? barCenter - h : barCenter;
        return (
          <rect
            key={i}
            className="fc-bar"
            style={{ animationDelay: `${i * 0.015}s` }}
            x={cx - barW / 2}
            y={y}
            width={barW}
            height={Math.max(1, h)}
            rx={1}
            fill={d.win ? "var(--accent)" : "var(--danger)"}
          />
        );
      })}
      <line x1={pad} x2={W - pad} y1={barCenter} y2={barCenter} stroke="var(--border)" />
    </svg>
  );
}

function Withdrawal({
  plan,
  update,
  fc,
}: {
  plan: TradingPlan;
  update: UpdateFn;
  fc: ForecastResult;
}) {
  const reco = useMemo(() => recommendWithdrawal(plan), [plan]);

  const monthlyGross = fc.pnl;
  const withdrawn =
    plan.withdrawalStrategy === "compound" ? 0 : Math.max(0, monthlyGross) * (plan.withdrawalRate / 100);
  const reinvested = monthlyGross - withdrawn;

  const progress = Math.max(0, Math.min(100, (plan.accountSize / Math.max(1, plan.capitalTarget)) * 100));
  const remaining = plan.capitalTarget - plan.accountSize;
  const months = reinvested > 0 && remaining > 0 ? Math.ceil(remaining / reinvested) : null;

  return (
    <section className="card p-6 sm:p-8">
      <h2 className="text-lg font-semibold">Plan de retrait — que fais-tu de tes gains ?</h2>
      <p className="mt-1 text-sm text-muted">
        Trois façons de gérer tes profits. Chacune a ses avantages et ses inconvénients —
        on te conseille selon ton capital.
      </p>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
        <span className="text-accent">★</span>
        <span className="text-muted">
          Conseillé pour toi : <b className="text-foreground">{WITHDRAWAL_STRATEGIES.find((s) => s.key === reco.strategy)?.label}</b> — {reco.reason}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {WITHDRAWAL_STRATEGIES.map((s) => {
          const active = plan.withdrawalStrategy === s.key;
          return (
            <button
              key={s.key}
              onClick={() => update("withdrawalStrategy", s.key as WithdrawalStrategy)}
              className={`rounded-xl border p-4 text-left transition ${
                active ? "border-accent bg-accent/10" : "border-border bg-surface-2 hover:border-accent/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{s.label}</span>
                {reco.strategy === s.key && <span className="shrink-0 text-[11px] text-accent">conseillé</span>}
              </div>
              <p className="mt-1 text-xs text-muted">{s.tagline}</p>
            </button>
          );
        })}
      </div>

      {/* Détail de la stratégie sélectionnée : avantages / inconvénients */}
      {(() => {
        const s = WITHDRAWAL_STRATEGIES.find((x) => x.key === plan.withdrawalStrategy);
        if (!s) return null;
        return (
          <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
            <p className="text-sm text-foreground">{s.desc}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-accent">Avantages</div>
                <ul className="space-y-1">
                  {s.pros.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted">
                      <span className="text-accent">+</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-danger">Inconvénients</div>
                <ul className="space-y-1">
                  {s.cons.map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted">
                      <span className="text-danger">−</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-3 border-t border-border pt-3 text-xs text-muted">
              <span className="font-medium text-foreground">Pour qui :</span> {s.bestFor}
            </div>
          </div>
        );
      })()}

      {plan.withdrawalStrategy !== "compound" && (
        <div className="mt-5 max-w-sm">
          <div className="mb-1 text-sm font-medium">Part des gains retirée</div>
          <Slider
            value={plan.withdrawalRate}
            min={0}
            max={100}
            step={5}
            format={(v) => `${v}%`}
            onChange={(v) => update("withdrawalRate", v)}
          />
        </div>
      )}

      {/* Barre de progression vers l'objectif */}
      <div className="mt-6 rounded-xl border border-border bg-surface-2 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs text-muted">Objectif de capital</div>
            <div className="mt-1 text-sm">
              <b>{fmtMoney(plan.accountSize, plan.currency)}</b>
              <span className="text-muted"> / {fmtMoney(plan.capitalTarget, plan.currency)}</span>
            </div>
          </div>
          <div className="w-32">
            <NumberInput
              value={plan.capitalTarget}
              min={plan.accountSize}
              step={1000}
              suffix={plan.currency}
              onChange={(v) => update("capitalTarget", v)}
            />
          </div>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-background">
          <div
            className="progress-fill h-full rounded-full bg-accent"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted">
          <span>{progress.toFixed(0)}% atteint</span>
          {months !== null ? (
            <span>
              À ce rythme : objectif dans ~<b className="text-foreground">{months} mois</b>
            </span>
          ) : (
            <span>Augmente le réinvesti pour progresser vers l&apos;objectif</span>
          )}
        </div>
      </div>

      <p className="mt-5 text-sm text-muted">
        Réparti sur le <b className="text-foreground">capital prévu par le forecast ci-dessus</b> —
        gain attendu{" "}
        <b className={monthlyGross >= 0 ? "text-accent" : "text-danger"}>
          {fmtMoney(monthlyGross, plan.currency)}/mois
        </b>{" "}
        ({fmtMoney(fc.finalCapital, plan.currency)} à 30 j) :
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Mini label="Gain mensuel (forecast)" value={fmtMoney(monthlyGross, plan.currency)} tone={monthlyGross >= 0 ? "ok" : "fail"} />
        <Mini label="Tu te verses / mois" value={fmtMoney(withdrawn, plan.currency)} />
        <Mini label="Réinvesti / mois" value={fmtMoney(reinvested, plan.currency)} tone={reinvested >= 0 ? "ok" : "fail"} />
      </div>
    </section>
  );
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "fail";
}) {
  const color = tone === "ok" ? "text-accent" : tone === "fail" ? "text-danger" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}
