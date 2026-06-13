"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
import {
  Reveal,
  Stagger,
  StaggerChild,
  AnimatedNumber,
  MagneticButton,
  TiltCard,
  Shine,
} from "@/components/motion";
import {
  blurIn,
  fadeUp,
  EASE_OUT,
  EASE_SOFT,
  springSoft,
  springSnappy,
} from "@/lib/motion";

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
    <div className="space-y-8">
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <span aria-hidden className="aurora-orb -right-24 -top-24" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <Shine delaySec={0.35} radius={16} />
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted"
          >
            <span className="pulse-ring relative flex h-1.5 w-1.5 rounded-full">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Discipline &gt; prédiction
          </motion.div>
          <motion.h1
            variants={blurIn}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.45, ease: EASE_SOFT, delay: 0.05 }}
            className="text-sheen mt-3 max-w-2xl text-2xl font-semibold sm:text-3xl"
          >
            Construis ton plan, puis valide chaque trade avant d&apos;entrer.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.14 }}
            className="mt-3 max-w-2xl text-sm text-muted"
          >
            Tu définis tes règles une fois. Ensuite, chaque trade passe par un check qui le
            valide ✅ ou le bloque ⛔ — avec les raisons.
          </motion.p>
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

      <Stagger className="grid gap-4 sm:grid-cols-2" stagger={0.09}>
        <StaggerChild>
          <Link
            href="/trade"
            className="card card-hover group block h-full p-5 transition hover:border-accent/50"
          >
            <div className="text-sm font-semibold">Check pré-trade</div>
            <p className="mt-1 text-sm text-muted">
              Avant d&apos;entrer : actif, session, état psycho, news, confirmations, niveaux.
              Donne le verdict + ta taille de position.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-accent">
              Vérifier un trade
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-1" aria-hidden>
                →
              </span>
            </div>
          </Link>
        </StaggerChild>
        <StaggerChild>
          <Link
            href="/journal"
            className="card card-hover group block h-full p-5 transition hover:border-accent/50"
          >
            <div className="text-sm font-semibold">Journal</div>
            <p className="mt-1 text-sm text-muted">
              Logge tes trades, mesure ton respect du plan, ton win rate et ta performance en R.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-accent">
              Ouvrir le journal →
            </div>
          </Link>
        </StaggerChild>
      </Stagger>
    </div>
  );
}

function UrgentCTA() {
  return (
    <Reveal as="section" className="card relative overflow-hidden border-warning/40 bg-warning/5 p-6 sm:p-8">
      <Shine delaySec={0.4} />
      <div className="flex items-start gap-4">
        <motion.span
          initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={springSnappy}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/15 text-xl text-warning"
        >
          ⚠
        </motion.span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Tu n&apos;as pas encore de plan de trading</h2>
          <p className="mt-1 text-sm text-muted">
            Sans plan, pas de discipline — et pas de trade. Définis tes règles (money
            management, psycho, confirmations) en quelques minutes.
          </p>
          <MagneticButton
            type="button"
            className="btn-primary relative mt-4 inline-flex overflow-hidden rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
            onClick={() => {
              window.location.href = "/plan";
            }}
          >
            Créer mon plan maintenant →
            <Shine loop radius={12} />
          </MagneticButton>
        </div>
      </div>
    </Reveal>
  );
}

function PlanReminders({ plan }: { plan: TradingPlan }) {
  const profile = classifyRiskProfile(plan);
  const assets = plan.assets.filter(Boolean);
  const sessions = SESSIONS.filter((s) => plan.sessions.includes(s.key)).map((s) => s.label);

  const rules: {
    label: string;
    value: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
  }[] = [
    { label: "Risque / trade", value: plan.riskPerTradePct, decimals: 1, suffix: "%" },
    { label: "RR minimum", value: plan.minRiskReward, decimals: 1 },
    { label: "Confirmations", value: plan.minConfluences, suffix: " min" },
    { label: "Perte max / jour", value: plan.maxDailyLossPct, prefix: "-", suffix: "%" },
    { label: "Perte max / sem.", value: plan.maxWeeklyLossPct, prefix: "-", suffix: "%" },
    { label: "Trades / jour", value: plan.maxTradesPerDay, suffix: " max" },
    { label: "Risque ouvert", value: plan.maxOpenRiskPct, suffix: "% max" },
    { label: "Kill-switch", value: plan.maxAccountDrawdownPct, prefix: "-", suffix: "%" },
  ];

  return (
    <Reveal>
      <TiltCard className="card card-hover p-6 sm:p-8" max={3}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-accent">Rappels — ton plan</p>
            <h2 className="mt-1 text-lg font-semibold">{plan.memberName || "Money management"}</h2>
          </div>
          <Badge tone={profile.tone}>Profil {profile.label}</Badge>
        </div>

        <Stagger className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4" stagger={0.04}>
          {rules.map((r) => (
            <StaggerChild key={r.label}>
              <div className="text-xs text-muted">{r.label}</div>
              <AnimatedNumber
                value={r.value}
                decimals={r.decimals ?? 0}
                prefix={r.prefix}
                suffix={r.suffix}
                className="mt-0.5 block text-sm font-semibold tabular-nums"
              />
            </StaggerChild>
          ))}
        </Stagger>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="text-xs text-muted">Actifs :</span>
          {assets.length ? (
            assets.map((a, i) => (
              <motion.span
                key={a}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ ...springSnappy, delay: 0.04 * i }}
                className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium"
              >
                {a}
              </motion.span>
            ))
          ) : (
            <span className="text-xs text-muted">aucun</span>
          )}
          {plan.watchIndices.length > 0 && (
            <>
              <span className="ml-2 text-xs text-muted">Indices :</span>
              {plan.watchIndices.map((i, idx) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ ...springSnappy, delay: 0.04 * idx }}
                  className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent"
                >
                  {i}
                </motion.span>
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
      </TiltCard>
    </Reveal>
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
    <Reveal as="section" className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Forecast — 30 jours</h2>
          <p className="mt-1 text-sm text-muted">
            Projection réaliste avec gains et pertes, à risque composé. Joue sur le win rate.
          </p>
        </div>
        <div className="text-right">
          <AnimatedNumber
            key={up ? "up" : "down"}
            value={Math.round(fc.finalCapital)}
            suffix={` ${plan.currency}`}
            className={`block text-2xl font-semibold tabular-nums ${up ? "text-accent" : "text-danger"}`}
          />
          <div className={`text-xs tabular-nums ${up ? "text-accent" : "text-danger"}`}>
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
        <Mini label="Trades gagnants" num={fc.wins} tone="ok" />
        <Mini label="Trades perdants" num={fc.losses} tone="fail" />
        <Mini label="Drawdown max" num={fc.maxDrawdownPct} decimals={1} prefix="-" suffix="%" tone="fail" />
        <Mini label="Win rate" num={plan.expectedWinRate} suffix="%" />
      </div>
      <p className="mt-3 text-xs text-muted">
        Capital de départ {fmtMoney(fc.start, plan.currency)}. Séquence simulée — l&apos;ordre
        réel des gains/pertes varie, mais le résultat attendu est cohérent.
      </p>
    </Reveal>
  );
}

function ForecastChart({ fc }: { fc: ReturnType<typeof simulateForecast> }) {
  const reduce = useReducedMotion();
  const W = 600;
  const H = 170;
  const pad = 10;
  const eqTop = 10;
  const eqBottom = 108;
  const barCenter = 142;
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

  // Re-key the whole drawing on the things that change its shape so the
  // entrance (line draw / area fade / bars rise) replays on win-rate changes.
  const drawKey = `${up ? "u" : "d"}-${fc.days.length}-${fc.wins}-${minCap.toFixed(0)}-${maxCap.toFixed(0)}`;

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

      {/* aire sous la courbe : fondu doux */}
      <motion.path
        key={`area-${drawKey}`}
        d={area}
        fill="url(#fcArea)"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.35 }}
      />

      {/* courbe de capital : tracé progressif */}
      <motion.path
        key={`line-${drawKey}`}
        d={line}
        pathLength={1}
        fill="none"
        stroke={stroke}
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 1, ease: EASE_SOFT },
          opacity: { duration: 0.25, ease: EASE_OUT },
        }}
      />

      {/* point de fin : apparition après le tracé */}
      <motion.circle
        key={`dot-${drawKey}`}
        cx={x(n - 1)}
        cy={yEq(caps[n - 1])}
        r={3.5}
        fill={stroke}
        initial={reduce ? false : { opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...springSnappy, delay: 0.95 }}
        style={{ transformOrigin: `${x(n - 1)}px ${yEq(caps[n - 1])}px` }}
      />

      {/* barres P&L par jour (gains bleus / pertes rouges) : montée échelonnée */}
      {fc.days.map((d, i) => {
        const h = (Math.abs(d.pnl) / maxAbsPnl) * barMax;
        const cx = x(i + 1);
        const barH = Math.max(1, h);
        const y = d.win ? barCenter - barH : barCenter;
        const originY = d.win ? barCenter : barCenter; // grow from the zero line
        return (
          <motion.rect
            key={i}
            x={cx - barW / 2}
            y={y}
            width={barW}
            height={barH}
            rx={1}
            fill={d.win ? "var(--accent)" : "var(--danger)"}
            initial={reduce ? false : { opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{
              duration: 0.4,
              ease: EASE_OUT,
              delay: 0.45 + i * 0.012,
            }}
            style={{ transformOrigin: `${cx}px ${originY}px` }}
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
  const reduce = useReducedMotion();
  const reco = useMemo(() => recommendWithdrawal(plan), [plan]);

  const monthlyGross = fc.pnl;
  const withdrawn =
    plan.withdrawalStrategy === "compound" ? 0 : Math.max(0, monthlyGross) * (plan.withdrawalRate / 100);
  const reinvested = monthlyGross - withdrawn;

  const progress = Math.max(0, Math.min(100, (plan.accountSize / Math.max(1, plan.capitalTarget)) * 100));
  const remaining = plan.capitalTarget - plan.accountSize;
  const months = reinvested > 0 && remaining > 0 ? Math.ceil(remaining / reinvested) : null;

  return (
    <Reveal as="section" className="card p-6 sm:p-8">
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
            <motion.button
              key={s.key}
              onClick={() => update("withdrawalStrategy", s.key as WithdrawalStrategy)}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              className={`relative rounded-xl border p-4 text-left transition-colors ${
                active ? "border-accent bg-accent/10" : "border-border bg-surface-2 hover:border-accent/40"
              }`}
            >
              {active && !reduce && (
                <motion.span
                  layoutId="withdraw-active"
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-accent"
                  style={{ boxShadow: "0 0 0 1px var(--accent), 0 8px 30px -12px var(--accent)" }}
                  transition={springSoft}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{s.label}</span>
                {reco.strategy === s.key && <span className="shrink-0 text-[11px] text-accent">conseillé</span>}
              </div>
              <p className="relative mt-1 text-xs text-muted">{s.tagline}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Détail de la stratégie sélectionnée : avantages / inconvénients */}
      <AnimatePresence mode="wait" initial={false}>
        {(() => {
          const s = WITHDRAWAL_STRATEGIES.find((x) => x.key === plan.withdrawalStrategy);
          if (!s) return null;
          return (
            <motion.div
              key={s.key}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="mt-4 rounded-xl border border-border bg-surface-2 p-4"
            >
              <p className="text-sm text-foreground">{s.desc}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-accent">Avantages</div>
                  <ul className="space-y-1">
                    {s.pros.map((p, i) => (
                      <motion.li
                        key={i}
                        initial={reduce ? false : { opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.05 + i * 0.05 }}
                        className="flex gap-2 text-sm text-muted"
                      >
                        <span className="text-accent">+</span>
                        <span>{p}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-danger">Inconvénients</div>
                  <ul className="space-y-1">
                    {s.cons.map((c, i) => (
                      <motion.li
                        key={i}
                        initial={reduce ? false : { opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.05 + i * 0.05 }}
                        className="flex gap-2 text-sm text-muted"
                      >
                        <span className="text-danger">−</span>
                        <span>{c}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-3 border-t border-border pt-3 text-xs text-muted">
                <span className="font-medium text-foreground">Pour qui :</span> {s.bestFor}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {plan.withdrawalStrategy !== "compound" && (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barre de progression vers l'objectif */}
      <div className="mt-6 rounded-xl border border-border bg-surface-2 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs text-muted">Objectif de capital</div>
            <div className="mt-1 text-sm tabular-nums">
              <AnimatedNumber
                value={Math.round(plan.accountSize)}
                suffix={` ${plan.currency}`}
                className="font-bold"
              />
              <span className="text-muted">
                {" "}/ <AnimatedNumber value={Math.round(plan.capitalTarget)} suffix={` ${plan.currency}`} />
              </span>
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
          <motion.div
            className="relative h-full rounded-full bg-accent"
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.7, ease: EASE_SOFT }}
            style={{ width: reduce ? `${progress}%` : undefined }}
          >
            {!reduce && progress > 4 && (
              <motion.span
                aria-hidden
                className="absolute inset-y-0 right-0 w-8 rounded-full"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35))",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.6, ease: EASE_OUT, repeat: Infinity, repeatDelay: 1.4 }}
              />
            )}
          </motion.div>
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted">
          <span className="tabular-nums">
            <AnimatedNumber value={Math.round(progress)} suffix="% atteint" />
          </span>
          {months !== null ? (
            <span>
              À ce rythme : objectif dans ~<b className="text-foreground tabular-nums">{months} mois</b>
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
        <Mini label="Gain mensuel (forecast)" num={Math.round(monthlyGross)} suffix={` ${plan.currency}`} tone={monthlyGross >= 0 ? "ok" : "fail"} />
        <Mini label="Tu te verses / mois" num={Math.round(withdrawn)} suffix={` ${plan.currency}`} />
        <Mini label="Réinvesti / mois" num={Math.round(reinvested)} suffix={` ${plan.currency}`} tone={reinvested >= 0 ? "ok" : "fail"} />
      </div>
    </Reveal>
  );
}

function Mini({
  label,
  num,
  decimals,
  prefix,
  suffix,
  tone,
}: {
  label: string;
  num: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  tone?: "ok" | "fail";
}) {
  const color = tone === "ok" ? "text-accent" : tone === "fail" ? "text-danger" : "text-foreground";
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      className="rounded-xl border border-border bg-surface-2 p-3"
    >
      <div className="text-xs text-muted">{label}</div>
      <AnimatedNumber
        value={num}
        decimals={decimals ?? 0}
        prefix={prefix}
        suffix={suffix}
        className={`mt-0.5 block text-sm font-semibold tabular-nums ${color}`}
      />
    </motion.div>
  );
}
