"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { EMOTIONS, ENTRY_CONDITIONS, SESSIONS } from "@/lib/plan";
import {
  classifyRiskProfile,
  computeRiskMath,
  EMPTY_TRADE,
  evaluateTrade,
  guardrailAdvice,
  type TradeInput,
} from "@/lib/calc";
import { usePlan } from "@/lib/usePlan";
import { useJournal } from "@/lib/useJournal";
import { todayStats } from "@/lib/journal";
import { Badge, Chip, Field, NumberInput, Section, Toggle } from "@/components/ui";
import { Reveal, Stagger, StaggerChild, AnimatedNumber, MagneticButton, Shine } from "@/components/motion";
import { springBouncy, springSnappy, EASE_OUT, EASE_SOFT } from "@/lib/motion";

const conditionLabel = (key: string) =>
  ENTRY_CONDITIONS.find((c) => c.key === key)?.label ?? key;

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function TradePage() {
  const { plan, loaded } = usePlan();
  const { trades, loaded: journalLoaded, add } = useJournal();
  const router = useRouter();
  const [t, setT] = useState<TradeInput>(EMPTY_TRADE);

  // Stats du jour → P&L et nombre de trades pris, calculés automatiquement.
  const today = useMemo(
    () => todayStats(trades, plan, todayISO()),
    [trades, plan],
  );

  // On injecte les valeurs auto dans l'évaluation.
  const tEval = useMemo<TradeInput>(
    () => ({ ...t, tradesTakenToday: today.tradesTaken, dailyPnlPct: today.pnlPct }),
    [t, today],
  );

  const evalResult = useMemo(() => evaluateTrade(plan, tEval), [plan, tEval]);
  const profile = useMemo(() => classifyRiskProfile(plan), [plan]);
  const advice = useMemo(() => guardrailAdvice(profile), [profile]);

  const logTrade = () => {
    add({
      id: crypto.randomUUID(),
      date: todayISO(),
      asset: t.asset,
      direction: t.direction,
      session: t.session,
      emotion: t.emotion,
      rrTarget: t.rrTarget || plan.minRiskReward,
      slPips: t.slPips,
      rrResult: 0,
      riskPct: plan.riskPerTradePct,
      status: "open",
      realizedAmount: null,
      followedPlan: true,
      confluences: t.checkedConditions,
      notes: "",
    });
    router.push("/journal");
  };

  const set = <K extends keyof TradeInput>(key: K, value: TradeInput[K]) =>
    setT((prev) => ({ ...prev, [key]: value }));

  const assets = plan.assets.filter(Boolean);

  if (!loaded || !journalLoaded) return <p className="text-sm text-muted">Chargement…</p>;

  const conditions = [...plan.enabledConditions, ...plan.customConditions];

  return (
    <div className="space-y-6">
      <Reveal y={14}>
        <h1 className="text-sheen text-xl font-semibold">Check pré-trade</h1>
        <p className="mt-1 text-sm text-muted">
          Renseigne le setup. Le verdict se met à jour en direct selon{" "}
          <Link href="/plan" className="text-accent underline-offset-2 hover:underline">
            ton plan
          </Link>
          .
        </p>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Colonne entrées */}
        <div className="space-y-6">
          <Reveal y={18} delay={0.04}>
            <Section title="Contexte">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Actif">
                  <select className="input" value={t.asset} onChange={(e) => set("asset", e.target.value)}>
                    <option value="">— choisir —</option>
                    {assets.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Sens">
                  <div className="flex gap-2">
                    <Chip active={t.direction === "buy"} onClick={() => set("direction", "buy")}>
                      Achat (long)
                    </Chip>
                    <Chip active={t.direction === "sell"} onClick={() => set("direction", "sell")} tone="danger">
                      Vente (short)
                    </Chip>
                  </div>
                </Field>
                <Field label="Session">
                  <select className="input" value={t.session} onChange={(e) => set("session", e.target.value)}>
                    <option value="">— choisir —</option>
                    {SESSIONS.filter((s) => plan.sessions.includes(s.key)).map((s) => (
                      <option key={s.key} value={s.key}>{s.label} · {s.window}</option>
                    ))}
                    {SESSIONS.filter((s) => !plan.sessions.includes(s.key)).map((s) => (
                      <option key={s.key} value={s.key}>{s.label} (hors plan)</option>
                    ))}
                  </select>
                </Field>
                <Field label="État psychologique">
                  <select className="input" value={t.emotion} onChange={(e) => set("emotion", e.target.value)}>
                    <option value="">— choisir —</option>
                    {EMOTIONS.map((e) => (
                      <option key={e} value={e}>
                        {e}{plan.blockingEmotions.includes(e) ? " ⛔" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3">
                <div>
                  <div className="text-sm font-medium">Pas de news high-impact imminente</div>
                  <div className="text-xs text-muted">Fenêtre ±{plan.newsFilterMinutes} min — vérifie le calendrier éco.</div>
                </div>
                <Toggle checked={t.newsClear} onChange={(v) => set("newsClear", v)} />
              </div>
            </Section>
          </Reveal>

          <Reveal y={18} delay={0.08}>
            <Section title="Confirmations d'entrée" description={`Coche les signaux présents. Minimum ${plan.minConfluences} — sinon, ne prends pas le trade.`}>
              {conditions.length === 0 ? (
                <p className="text-sm text-muted">
                  Aucune confirmation définie. <Link href="/plan" className="text-accent">Configure ton plan</Link>.
                </p>
              ) : (
                <Stagger className="flex flex-wrap gap-2" stagger={0.04}>
                  {conditions.map((key) => (
                    <StaggerChild key={key}>
                      <Chip
                        active={t.checkedConditions.includes(key)}
                        onClick={() =>
                          setT((prev) => ({
                            ...prev,
                            checkedConditions: prev.checkedConditions.includes(key)
                              ? prev.checkedConditions.filter((c) => c !== key)
                              : [...prev.checkedConditions, key],
                          }))
                        }
                      >
                        {conditionLabel(key)}
                      </Chip>
                    </StaggerChild>
                  ))}
                </Stagger>
              )}
            </Section>
          </Reveal>

          <Reveal y={18} delay={0.12}>
            <Section title="Niveaux" description="On se fiche de l'entrée exacte — ce qui compte c'est le RR visé et ta taille de stop en pips. Le take-profit en découle.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="RR visé" hint={`Ton minimum de plan : ${plan.minRiskReward.toFixed(1)} : 1`}>
                  <NumberInput value={t.rrTarget} min={0} step={0.1} suffix=": 1" onChange={(v) => set("rrTarget", v)} />
                </Field>
                <Field label="Taille du stop (SL)" hint="Distance entrée → SL, en pips">
                  <NumberInput value={t.slPips} min={0} step={1} suffix="pips" onChange={(v) => set("slPips", v)} />
                </Field>
              </div>
              <LevelsPreview plan={plan} t={t} />
            </Section>
          </Reveal>

          <Reveal y={18} delay={0.16}>
            <Section title="Garde-fous" description="Adaptés à ton profil. Le P&L et le nombre de trades du jour sont calculés automatiquement depuis ton journal.">
              <div className={`rounded-xl border p-4 ${
                profile.tone === "fail" ? "border-danger/40 bg-danger/10"
                : profile.tone === "ok" ? "border-accent/40 bg-accent/10"
                : "border-warning/40 bg-warning/10"
              }`}>
                <div className="flex items-center gap-2">
                  <Badge tone={profile.tone}>Profil {profile.label}</Badge>
                </div>
                <Stagger as="ul" className="mt-3 space-y-1.5" stagger={0.05} delayChildren={0.05}>
                  {advice.map((a, i) => (
                    <StaggerChild as="li" key={i} className="flex gap-2 text-sm text-foreground">
                      <span className="text-muted">→</span>
                      <span>{a}</span>
                    </StaggerChild>
                  ))}
                </Stagger>
              </div>

              {/* État du jour (auto) */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface-2 p-3">
                  <div className="text-xs text-muted">P&amp;L du jour (auto)</div>
                  <div className={`mt-0.5 text-base font-semibold ${
                    today.pnlAmount > 0 ? "text-accent" : today.pnlAmount < 0 ? "text-danger" : ""
                  }`}>
                    <span aria-hidden>{today.pnlAmount >= 0 ? "+" : "−"}</span>
                    <AnimatedNumber
                      value={Math.abs(Math.round(today.pnlAmount))}
                      suffix={` ${plan.currency}`}
                    />
                    <span className="ml-1 text-xs font-normal text-muted">
                      (<span aria-hidden>{today.pnlPct >= 0 ? "+" : "−"}</span>
                      <AnimatedNumber value={Math.abs(today.pnlPct)} decimals={1} suffix="%" />)
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-surface-2 p-3">
                  <div className="text-xs text-muted">Trades pris aujourd&apos;hui (auto)</div>
                  <div className="mt-0.5 text-base font-semibold">
                    <AnimatedNumber value={today.tradesTaken} /> <span className="text-xs font-normal text-muted">/ {plan.maxTradesPerDay} max</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Risque déjà engagé" hint="Sur tes positions ouvertes">
                  <NumberInput value={t.openRiskPct} min={0} step={0.1} suffix="%" onChange={(v) => set("openRiskPct", v)} />
                </Field>
                <Field label="Drawdown actuel" hint="Du compte, depuis le pic">
                  <NumberInput value={t.accountDrawdownPct} min={0} step={0.5} suffix="%" onChange={(v) => set("accountDrawdownPct", v)} />
                </Field>
              </div>
            </Section>
          </Reveal>
        </div>

        {/* Colonne verdict */}
        <Reveal y={18} delay={0.1} className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Verdict result={evalResult} plan={plan} />
          <MagneticButton
            onClick={logTrade}
            disabled={!t.asset}
            strength={4}
            className="relative w-full overflow-hidden rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold transition hover:border-accent/50 hover:text-foreground disabled:opacity-40"
          >
            Logger ce trade (ouvert) →
            {t.asset && <Shine loop durationSec={2.4} delaySec={1.4} radius={12} />}
          </MagneticButton>
          <p className="px-1 text-xs text-muted">
            Le trade est enregistré comme <b className="text-foreground">ouvert</b>. Tu le clôtureras
            depuis le journal une fois sorti.
          </p>
        </Reveal>
      </div>
    </div>
  );
}

function LevelsPreview({ plan, t }: { plan: ReturnType<typeof usePlan>["plan"]; t: TradeInput }) {
  const math = computeRiskMath(plan, t);
  const ready = math.rr !== null && math.slPips !== 0;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!ready ? (
        <motion.p
          key="hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="mt-3 text-xs text-muted"
        >
          Renseigne le RR visé et la taille du stop pour voir le take-profit et la valeur par pip.
        </motion.p>
      ) : (
        <motion.div
          key="levels"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: EASE_SOFT }}
          className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <Stagger className="contents" stagger={0.07}>
            <MiniNum label="Pips SL" value={math.slPips} />
            <MiniNum label="Pips TP" value={math.tpPips !== null ? Math.round(math.tpPips) : null} tone="ok" />
            <MiniNum label="Risque" value={math.riskAmount} suffix={` ${plan.currency}`} tone="fail" />
            <MiniNum label="Gain visé" value={math.rewardAmount} suffix={` ${plan.currency}`} tone="ok" />
          </Stagger>
          {math.valuePerPip !== null && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.4, ease: EASE_SOFT }}
              className="col-span-2 rounded-xl border border-accent/30 bg-accent/5 p-3 sm:col-span-4"
            >
              <div className="text-xs text-muted">Valeur par pip pour respecter ton risque</div>
              <div className="mt-0.5 text-sm">
                <b className="text-foreground">
                  <AnimatedNumber value={math.valuePerPip} decimals={2} suffix={` ${plan.currency}/pip`} />
                </b>
                <span className="text-muted"> — {math.slPips} pips de SL × RR {math.rr?.toFixed(1)} = {math.tpPips !== null ? Math.round(math.tpPips) : "—"} pips jusqu&apos;au TP</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MiniNum({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  tone?: "ok" | "fail";
}) {
  const color = tone === "ok" ? "text-accent" : tone === "fail" ? "text-danger" : "text-foreground";
  return (
    <StaggerChild className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${color}`}>
        {value === null ? "—" : <AnimatedNumber value={value} suffix={suffix} />}
      </div>
    </StaggerChild>
  );
}

function Verdict({
  result,
  plan,
}: {
  result: ReturnType<typeof evaluateTrade>;
  plan: ReturnType<typeof usePlan>["plan"];
}) {
  const { valid, blockingFails, warnings, checks, math } = result;
  return (
    <div className="card overflow-hidden">
      {/* HERO verdict — premium spring reveal, color-correct (blue OK / rose block) */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={valid ? "valid" : "blocked"}
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -4 }}
          transition={springBouncy}
          className={`relative overflow-hidden p-5 ${valid ? "bg-accent/10" : "bg-danger/10"}`}
        >
          {/* soft directional glow behind the verdict label */}
          <motion.span
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="pointer-events-none absolute -left-6 -top-10 h-32 w-32 rounded-full blur-2xl"
            style={{ background: valid ? "var(--accent)" : "var(--danger)", opacity: 0.16 }}
          />
          <Shine durationSec={0.9} delaySec={0.08} />
          <div className="relative flex items-center gap-2">
            <motion.span
              initial={{ scale: 0.4, rotate: valid ? -12 : 0 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...springBouncy, delay: 0.05 }}
              className={`text-2xl ${valid ? "text-accent" : "text-danger"}`}
            >
              {valid ? "✅" : "⛔"}
            </motion.span>
            <div>
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, ease: EASE_OUT, delay: 0.04 }}
                className={`text-lg font-semibold ${valid ? "text-accent" : "text-danger"}`}
              >
                {valid ? "Trade valide" : "Trade bloqué"}
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.1 }}
                className="text-xs text-muted"
              >
                {valid
                  ? warnings > 0
                    ? `${warnings} avertissement(s) à considérer`
                    : "Toutes les règles respectées"
                  : `Ne prends pas ce trade · ${blockingFails} règle(s) non respectée(s)`}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Maths */}
      <div className="grid grid-cols-3 divide-x divide-border border-y border-border text-center">
        <Stat
          label="RR visé"
          value={math.rr}
          decimals={2}
          ok={math.rr !== null && math.rr >= plan.minRiskReward}
        />
        <Stat label="Risque" value={math.riskAmount} suffix={` ${plan.currency}`} />
        <Stat
          label="Gain visé"
          value={math.rr !== null ? math.rewardAmount : null}
          suffix={` ${plan.currency}`}
        />
      </div>
      {math.valuePerPip !== null && (
        <div className="border-b border-border px-5 py-3 text-xs text-muted">
          Vise{" "}
          <b className="text-foreground">{math.valuePerPip.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {plan.currency}/pip</b>{" "}
          sur {math.slPips} pips de SL{math.tpPips !== null && <> → TP à {Math.round(math.tpPips)} pips</>}.
        </div>
      )}

      {/* Checks */}
      <Stagger as="ul" className="divide-y divide-border" stagger={0.045} delayChildren={0.12}>
        {checks.map((c) => (
          <StaggerChild as="li" key={c.id} className="flex items-start gap-3 px-5 py-2.5">
            <span className="mt-0.5">
              {c.ok ? (
                <Badge tone="ok">OK</Badge>
              ) : c.blocking ? (
                <Badge tone="fail">STOP</Badge>
              ) : (
                <Badge tone="warn">!</Badge>
              )}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium">{c.label}</span>
              <span className="block text-xs text-muted">{c.detail}</span>
            </span>
          </StaggerChild>
        ))}
      </Stagger>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  decimals = 0,
  ok,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  decimals?: number;
  ok?: boolean;
}) {
  return (
    <motion.div
      className="px-2 py-3"
      animate={ok === undefined ? undefined : { scale: ok ? [1, 1.05, 1] : 1 }}
      transition={springSnappy}
    >
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-base font-semibold ${ok === undefined ? "" : ok ? "text-accent" : "text-danger"}`}>
        {value === null ? "—" : <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />}
      </div>
    </motion.div>
  );
}
