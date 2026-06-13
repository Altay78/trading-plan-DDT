"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ASSET_CATALOG,
  EMOTIONS,
  ENTRY_CONDITIONS,
  MAX_ASSETS,
  SESSIONS,
  WATCH_INDICES,
  suggestIndices,
  type EntryConditionKey,
  type TradingPlan,
} from "@/lib/plan";
import {
  breakEvenWinRate,
  classifyRiskProfile,
  projectTrades,
  simulateForecast,
  type Forecast,
} from "@/lib/calc";
import { usePlan } from "@/lib/usePlan";
import { Badge, Chip, Field, NumberInput, Section } from "@/components/ui";
import { Slider } from "@/components/Slider";
import {
  EASE_OUT,
  EASE_SOFT,
  springSnappy,
  springSoft,
  springBouncy,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";
import {
  AnimatedNumber,
  MagneticButton,
  Reveal,
  Stagger,
  StaggerChild,
} from "@/components/motion";

const PROJECTION_TRADES = 30;
const FORECAST_TRADES = 30;

const STEPS = [
  { id: "capital", title: "Capital" },
  { id: "mm", title: "Money management" },
  { id: "psycho", title: "Psychologie" },
  { id: "confirm", title: "Confirmations" },
  { id: "sessions", title: "Sessions" },
  { id: "assets", title: "Actifs & indices" },
  { id: "recap", title: "Récap & profil" },
] as const;

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

// Slide+fade variants for step transitions. `direction` = 1 forward, -1 back.
const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 36 : -36 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -36 : 36 }),
};

export default function PlanPage() {
  const { plan, loaded, exists, save, update, reset } = usePlan();
  const [step, setStep] = useState(0);
  const [customInput, setCustomInput] = useState("");
  // Track navigation direction so the slide animation knows which way to go.
  const [direction, setDirection] = useState(1);
  // Plan déjà établi → on affiche une vue d'ensemble en lecture ;
  // "Modifier" rouvre le wizard d'édition.
  const [forceEdit, setForceEdit] = useState(false);
  const goToStep = (next: number) => {
    setDirection(next >= step ? 1 : -1);
    setStep(next);
  };

  if (!loaded) return <p className="text-sm text-muted">Chargement…</p>;

  const handleReset = () => {
    if (confirm("Réinitialiser le plan et tout recommencer ?")) {
      reset();
      setStep(0);
      setForceEdit(true);
    }
  };

  // Vue d'ensemble du plan établi (lecture) tant qu'on ne clique pas "Modifier".
  if (exists && !forceEdit) {
    return (
      <PlanOverview
        plan={plan}
        onEdit={() => {
          setForceEdit(true);
          setStep(0);
          setDirection(1);
        }}
        onReset={handleReset}
      />
    );
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const assets = plan.assets.filter(Boolean);
  const totalConfirmations = plan.enabledConditions.length + plan.customConditions.length;

  const selectAsset = (a: string) => {
    const cur = plan.assets.filter(Boolean);
    if (cur.includes(a)) update("assets", cur.filter((x) => x !== a));
    else if (cur.length < MAX_ASSETS) update("assets", [...cur, a]);
  };

  const addCustom = () => {
    const v = customInput.trim();
    if (!v || plan.customConditions.includes(v) || plan.enabledConditions.includes(v as never)) {
      setCustomInput("");
      return;
    }
    update("customConditions", [...plan.customConditions, v]);
    setCustomInput("");
  };
  const removeCustom = (c: string) =>
    update("customConditions", plan.customConditions.filter((x) => x !== c));

  const suggested = suggestIndices(assets);

  return (
    <div className="space-y-6 animate-stagger">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Mon plan de trading</h1>
          <p className="mt-1 text-sm text-muted">
            Construis-le étape par étape. Tout est sauvegardé automatiquement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {exists && (
            <button
              onClick={() => {
                setForceEdit(false);
                setStep(0);
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:text-foreground"
            >
              ← Vue d&apos;ensemble
            </button>
          )}
          <button
            onClick={handleReset}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:text-danger"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Progression */}
      <div className="card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Étape{" "}
            <AnimatedNumber value={step + 1} durationMs={420} className="tabular-nums" locale="" />{" "}
            / {STEPS.length}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={current.id}
              className="text-muted"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
            >
              {current.title}
            </motion.span>
          </AnimatePresence>
        </div>
        {/* Continuous fill that springs across the whole track. */}
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-accent"
            initial={false}
            animate={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            transition={springSoft}
          />
        </div>
        {/* Clickable step dots with spring pop on the active one. */}
        <div className="mt-3 flex items-center justify-between">
          {STEPS.map((s, i) => {
            const reached = i <= step;
            const active = i === step;
            return (
              <motion.button
                key={s.id}
                onClick={() => goToStep(i)}
                aria-label={s.title}
                aria-current={active ? "step" : undefined}
                className="relative grid h-7 w-7 place-items-center rounded-full"
                whileTap={{ scale: 0.85 }}
                whileHover={{ scale: 1.12 }}
                transition={springSnappy}
              >
                <motion.span
                  className={`block rounded-full ${reached ? "bg-accent" : "border border-border bg-surface-2"}`}
                  initial={false}
                  animate={{
                    width: active ? 11 : 7,
                    height: active ? 11 : 7,
                    boxShadow: active
                      ? "0 0 0 4px color-mix(in srgb, var(--accent) 22%, transparent)"
                      : "0 0 0 0px transparent",
                  }}
                  transition={springBouncy}
                />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Contenu d'étape — slide directionnel forward/back.
          Le wrapper absorbe le fade-up CSS de .animate-stagger (nth-child),
          l'AnimatePresence interne gère le slide directionnel sans conflit. */}
      <div>
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={current.id}
          custom={direction}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.32, ease: EASE_OUT }}
        >

      {/* Étape : Capital */}
      {current.id === "capital" && (
        <Section title="Capital & identité" description="On part de ton capital — tout le reste en découle.">
          <motion.div
            className="grid gap-4 sm:grid-cols-3"
            variants={staggerContainer(0.07)}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={staggerItem}>
            <Field label="Nom du membre">
              <input
                className="input"
                value={plan.memberName}
                placeholder="Ex. Altay"
                onChange={(e) => update("memberName", e.target.value)}
              />
            </Field>
            </motion.div>
            <motion.div variants={staggerItem}>
            <Field label="Capital du compte">
              <NumberInput value={plan.accountSize} min={0} suffix={plan.currency} onChange={(v) => update("accountSize", v)} />
            </Field>
            </motion.div>
            <motion.div variants={staggerItem}>
            <Field label="Devise">
              <select className="input" value={plan.currency} onChange={(e) => update("currency", e.target.value)}>
                <option value="€">€ (EUR)</option>
                <option value="$">$ (USD)</option>
                <option value="£">£ (GBP)</option>
              </select>
            </Field>
            </motion.div>
          </motion.div>
        </Section>
      )}

      {/* Étape : Money management */}
      {current.id === "mm" && (
        <Section title="Money management" description="Le socle. Le risque par trade et le RR minimum priment sur tout le reste.">
          <motion.div
            className="grid gap-6 rounded-xl border border-border bg-surface-2 p-4 sm:grid-cols-3"
            variants={staggerContainer(0.08)}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={staggerItem}>
            <Field label="Risque par trade" hint="% du capital perdu si SL touché — jusqu'à 15% en compte propre">
              <Slider value={plan.riskPerTradePct} min={0.25} max={15} step={0.25} format={(v) => `${v}%`} onChange={(v) => update("riskPerTradePct", v)} />
            </Field>
            </motion.div>
            <motion.div variants={staggerItem}>
            <Field label="Risk:Reward minimum" hint="Gain visé ÷ risque">
              <Slider value={plan.minRiskReward} min={1} max={5} step={0.1} format={(v) => `${v.toFixed(1)} : 1`} onChange={(v) => update("minRiskReward", v)} />
            </Field>
            </motion.div>
            <motion.div variants={staggerItem}>
            <Field label="Win rate attendu" hint="Sert au forecast de l'accueil">
              <Slider value={plan.expectedWinRate} min={30} max={80} step={1} format={(v) => `${v}%`} onChange={(v) => update("expectedWinRate", v)} />
            </Field>
            </motion.div>
          </motion.div>

          {/* Limites & objectifs — choix de l'unité */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Limites & objectifs</div>
              <p className="text-xs text-muted">Du plus court terme au plus long. Choisis ton unité.</p>
            </div>
            <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5 text-sm">
              <button
                onClick={() => update("mmDisplayUnit", "pct")}
                className={`rounded-md px-3 py-1 transition ${plan.mmDisplayUnit === "pct" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"}`}
              >
                %
              </button>
              <button
                onClick={() => update("mmDisplayUnit", "cur")}
                className={`rounded-md px-3 py-1 transition ${plan.mmDisplayUnit === "cur" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"}`}
              >
                {plan.currency}
              </button>
            </div>
          </div>

          <motion.div
            className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer(0.05)}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={staggerItem}>
            <Field label="Nombre de trades max / jour" hint="Au-delà → on arrête">
              <NumberInput value={plan.maxTradesPerDay} min={1} step={1} onChange={(v) => update("maxTradesPerDay", v)} />
            </Field>
            </motion.div>
            <motion.div variants={staggerItem}>
            <MmLimit label="Gain max / jour" hint="Objectif atteint → arrête, c'est gagné" pct={plan.maxDailyGainPct} onChange={(v) => update("maxDailyGainPct", v)} unit={plan.mmDisplayUnit} accountSize={plan.accountSize} currency={plan.currency} />
            </motion.div>
            <motion.div variants={staggerItem}>
            <MmLimit label="Perte max / jour" hint="Limite bloquante — stop la journée" pct={plan.maxDailyLossPct} onChange={(v) => update("maxDailyLossPct", v)} unit={plan.mmDisplayUnit} accountSize={plan.accountSize} currency={plan.currency} />
            </motion.div>
            <motion.div variants={staggerItem}>
            <MmLimit label="Objectif de gain / semaine" pct={plan.maxWeeklyGainPct} onChange={(v) => update("maxWeeklyGainPct", v)} unit={plan.mmDisplayUnit} accountSize={plan.accountSize} currency={plan.currency} />
            </motion.div>
            <motion.div variants={staggerItem}>
            <MmLimit label="Limite de perte / semaine" hint="Stop la semaine si atteinte" pct={plan.maxWeeklyLossPct} onChange={(v) => update("maxWeeklyLossPct", v)} unit={plan.mmDisplayUnit} accountSize={plan.accountSize} currency={plan.currency} />
            </motion.div>
            <motion.div variants={staggerItem}>
            <MmLimit label="Objectif mensuel" hint="Ta cible de gain sur le mois" pct={plan.monthlyTargetPct} onChange={(v) => update("monthlyTargetPct", v)} unit={plan.mmDisplayUnit} accountSize={plan.accountSize} currency={plan.currency} step={1} />
            </motion.div>
            <motion.div variants={staggerItem}>
            <MmLimit label="Risque ouvert max" hint="Cumul sur toutes les positions ouvertes" pct={plan.maxOpenRiskPct} onChange={(v) => update("maxOpenRiskPct", v)} unit={plan.mmDisplayUnit} accountSize={plan.accountSize} currency={plan.currency} />
            </motion.div>
            <motion.div variants={staggerItem}>
            <Field label="Drawdown max (kill-switch)" hint="Toujours en % — on arrête tout">
              <NumberInput value={plan.maxAccountDrawdownPct} min={0} step={1} suffix="%" onChange={(v) => update("maxAccountDrawdownPct", v)} />
            </Field>
            </motion.div>
          </motion.div>
        </Section>
      )}

      {/* Étape : Psycho */}
      {current.id === "psycho" && (
        <Section
          title="Psychologie — états bloquants"
          description="Sélectionne les états dans lesquels tu t'interdis de trader. Au check pré-trade, ils bloqueront l'entrée."
        >
          <motion.div
            className="flex flex-wrap gap-2"
            variants={staggerContainer(0.035)}
            initial="hidden"
            animate="visible"
          >
            {EMOTIONS.map((e) => (
              <motion.span key={e} variants={staggerItem} className="inline-flex">
                <Chip tone="danger" active={plan.blockingEmotions.includes(e)} onClick={() => update("blockingEmotions", toggle(plan.blockingEmotions, e))}>
                  {e}
                </Chip>
              </motion.span>
            ))}
          </motion.div>
        </Section>
      )}

      {/* Étape : Confirmations */}
      {current.id === "confirm" && (
        <Section
          title="Confirmations d'entrée"
          description="Les signaux que tu exiges avant d'entrer. Au check pré-trade, il faudra en réunir le minimum — sinon le trade est refusé."
        >
          <motion.div
            className="flex flex-wrap gap-2"
            variants={staggerContainer(0.035)}
            initial="hidden"
            animate="visible"
          >
            {ENTRY_CONDITIONS.map((c) => (
              <motion.span key={c.key} variants={staggerItem} className="inline-flex">
                <Chip
                  active={plan.enabledConditions.includes(c.key)}
                  onClick={() => update("enabledConditions", toggle(plan.enabledConditions, c.key) as EntryConditionKey[])}
                >
                  {c.label}
                </Chip>
              </motion.span>
            ))}
          </motion.div>

          <div className="mt-5">
            <div className="mb-2 text-sm font-medium">Autre confirmation</div>
            {plan.customConditions.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                <AnimatePresence initial={false}>
                  {plan.customConditions.map((c) => (
                    <motion.span
                      key={c}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={springBouncy}
                      className="inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent/15 px-3 py-1.5 text-sm text-accent"
                    >
                      {c}
                      <button onClick={() => removeCustom(c)} className="text-accent/60 transition hover:text-accent" aria-label="Retirer">
                        ✕
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            )}
            <div className="flex max-w-md gap-2">
              <input
                className="input"
                placeholder="Ex. Divergence RSI, volume, news fondamentale…"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                }}
              />
              <button
                onClick={addCustom}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-muted transition hover:border-accent/50 hover:text-foreground"
              >
                Ajouter
              </button>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Ajoute tes propres critères s&apos;ils ne sont pas dans la liste. Ils compteront comme confirmations.
            </p>
          </div>

          <div className="mt-5 max-w-xs">
            <Field label="Confirmations minimum" hint={`Sur ${totalConfirmations} activée(s)`}>
              <NumberInput value={plan.minConfluences} min={1} max={totalConfirmations || 1} step={1} onChange={(v) => update("minConfluences", v)} />
            </Field>
          </div>
        </Section>
      )}

      {/* Étape : Sessions */}
      {current.id === "sessions" && (
        <Section title="Sessions & filtre news">
          <motion.div
            className="flex flex-wrap gap-2"
            variants={staggerContainer(0.05)}
            initial="hidden"
            animate="visible"
          >
            {SESSIONS.map((s) => (
              <motion.span key={s.key} variants={staggerItem} className="inline-flex">
                <Chip active={plan.sessions.includes(s.key)} onClick={() => update("sessions", toggle(plan.sessions, s.key))}>
                  {s.label} <span className="opacity-60">· {s.window}</span>
                </Chip>
              </motion.span>
            ))}
          </motion.div>
          <p className="mt-2 text-xs text-muted">Horaires indicatifs (heure de Paris).</p>
          <div className="mt-5 max-w-xs">
            <Field label="Fenêtre filtre news" hint="Ne pas trader X min avant/après une news high-impact">
              <NumberInput value={plan.newsFilterMinutes} min={0} step={5} suffix="min" onChange={(v) => update("newsFilterMinutes", v)} />
            </Field>
          </div>
        </Section>
      )}

      {/* Étape : Actifs & indices */}
      {current.id === "assets" && (
        <div className="space-y-6">
          <Section title="Actifs" description={`Choisis jusqu'à ${MAX_ASSETS} actifs — reste focus sur ce que tu maîtrises.`}>
            <div className="mb-4 flex items-center gap-2 text-sm">
              <span className="text-muted">Sélectionnés :</span>
              <AnimatePresence mode="popLayout" initial={false}>
                {assets.length ? (
                  assets.map((a) => (
                    <motion.span
                      key={a}
                      layout
                      initial={{ opacity: 0, scale: 0.6, y: -2 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={springBouncy}
                      className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent"
                    >
                      {a}
                    </motion.span>
                  ))
                ) : (
                  <motion.span
                    key="none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-muted"
                  >
                    aucun
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="ml-auto text-xs text-muted tabular-nums">
                <AnimatedNumber value={assets.length} durationMs={400} locale="" />/{MAX_ASSETS}
              </span>
            </div>
            <div className="space-y-4">
              {ASSET_CATALOG.map((group, gi) => (
                <div key={group.category}>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{group.category}</div>
                  <motion.div
                    className="flex flex-wrap gap-2"
                    variants={staggerContainer(0.03, gi * 0.05)}
                    initial="hidden"
                    animate="visible"
                  >
                    {group.assets.map((a) => {
                      const selected = assets.includes(a);
                      const full = assets.length >= MAX_ASSETS;
                      return (
                        <motion.span key={a} variants={staggerItem} className="inline-flex">
                          <Chip active={selected} disabled={!selected && full} onClick={() => selectAsset(a)}>
                            {a}
                          </Chip>
                        </motion.span>
                      );
                    })}
                  </motion.div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Indices à surveiller" description="Contexte macro. On te conseille selon tes actifs.">
            <AnimatePresence initial={false}>
              {suggested.length > 0 && (
                <motion.div
                  key="suggested"
                  layout
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={springSoft}
                  className="mb-4 rounded-xl border border-accent/40 bg-accent/10 p-4"
                >
                  <div className="mb-2 text-sm font-medium text-accent">Conseillés selon tes actifs</div>
                  <motion.div className="space-y-2" variants={staggerContainer(0.05)} initial="hidden" animate="visible">
                    {suggested.map((s) => {
                      const on = plan.watchIndices.includes(s.key);
                      return (
                        <motion.div key={s.key} variants={staggerItem} className="flex items-start gap-3">
                          <motion.button
                            onClick={() => update("watchIndices", toggle(plan.watchIndices, s.key))}
                            whileTap={{ scale: 0.92 }}
                            transition={springSnappy}
                            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                              on ? "border-accent bg-accent text-accent-foreground" : "border-accent/50 text-accent"
                            }`}
                          >
                            {on ? "✓ " : "+ "}{s.key}
                          </motion.button>
                          <span className="text-xs text-muted">{s.reason}</span>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div className="space-y-2" variants={staggerContainer(0.04)} initial="hidden" animate="visible">
              {WATCH_INDICES.map((idx) => {
                const active = plan.watchIndices.includes(idx.key);
                return (
                  <motion.button
                    key={idx.key}
                    type="button"
                    variants={staggerItem}
                    onClick={() => update("watchIndices", toggle(plan.watchIndices, idx.key))}
                    whileTap={{ scale: 0.99 }}
                    transition={springSnappy}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      active ? "border-accent/50 bg-accent/10" : "border-border bg-surface-2"
                    }`}
                  >
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${active ? "border-accent bg-accent" : "border-border"}`}>
                      <motion.span
                        className="text-xs text-accent-foreground"
                        initial={false}
                        animate={{ scale: active ? 1 : 0, opacity: active ? 1 : 0 }}
                        transition={springBouncy}
                      >
                        ✓
                      </motion.span>
                    </span>
                    <span className="flex-1">
                      <span className="text-sm font-medium">{idx.label}</span>
                      <span className="ml-2 text-xs text-muted">{idx.note}</span>
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          </Section>
        </div>
      )}

      {/* Étape : Récap & profil */}
      {current.id === "recap" && <Recap plan={plan} />}

        </motion.div>
      </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <MagneticButton
          onClick={() => goToStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-30"
        >
          ← Précédent
        </MagneticButton>
        {isLast ? (
          <MagneticButton
            onClick={() => {
              save(plan); // persiste le plan (exists = true)
              setForceEdit(false); // affiche la vue d'ensemble du plan établi
              setStep(0);
            }}
            className="btn-primary rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Terminer ✓
          </MagneticButton>
        ) : (
          <MagneticButton
            onClick={() => goToStep(Math.min(STEPS.length - 1, step + 1))}
            className="btn-primary rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Suivant →
          </MagneticButton>
        )}
      </div>
    </div>
  );
}

// Champ de limite affichable en % ou en devise (stocké en % en interne).
function MmLimit({
  label,
  hint,
  pct,
  onChange,
  unit,
  accountSize,
  currency,
  step = 0.5,
}: {
  label: string;
  hint?: string;
  pct: number;
  onChange: (pct: number) => void;
  unit: "pct" | "cur";
  accountSize: number;
  currency: string;
  step?: number;
}) {
  if (unit === "cur") {
    const curValue = Math.round((pct / 100) * accountSize);
    const curStep = Math.max(1, Math.round((step / 100) * accountSize));
    return (
      <Field label={label} hint={hint ? `${hint} · ${pct.toFixed(2)}% du capital` : `${pct.toFixed(2)}% du capital`}>
        <NumberInput
          value={curValue}
          min={0}
          step={curStep}
          suffix={currency}
          onChange={(v) => onChange(accountSize > 0 ? (v / accountSize) * 100 : 0)}
        />
      </Field>
    );
  }
  return (
    <Field label={label} hint={hint}>
      <NumberInput value={Number(pct.toFixed(2))} min={0} step={step} suffix="%" onChange={onChange} />
    </Field>
  );
}

function Recap({ plan }: { plan: TradingPlan }) {
  const profile = classifyRiskProfile(plan);
  const tone = { ok: "border-accent/40 bg-accent/10", warn: "border-warning/40 bg-warning/10", fail: "border-danger/40 bg-danger/10" }[profile.tone];
  return (
    <div className="space-y-6">
      <Section title="Ton profil de trader" description="Déduit automatiquement de ton plan (risque, RR, confirmations, fréquence).">
        <motion.div
          className={`rounded-xl border p-5 ${tone}`}
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={springSoft}
        >
          <div className="flex items-center gap-3">
            <Badge tone={profile.tone}>{profile.label}</Badge>
            <span className="text-xs text-muted">
              score <AnimatedNumber value={profile.score} durationMs={650} locale="" className="tabular-nums" />
            </span>
          </div>
          <motion.p
            className="mt-3 text-sm text-foreground"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.12 }}
          >
            {profile.summary}
          </motion.p>
        </motion.div>
      </Section>
      <Projection plan={plan} />
    </div>
  );
}

function Projection({ plan }: { plan: TradingPlan }) {
  const { riskAmount, breakEven, rows } = useMemo(
    () => projectTrades(plan, PROJECTION_TRADES),
    [plan],
  );

  return (
    <Section
      title="Projection & rentabilité"
      description={`Calculé depuis ton capital, ton risque par trade et ton RR cible (${plan.minRiskReward}). Risque fixe par trade, hors frais/spread.`}
    >
      <motion.div
        className="grid gap-3 sm:grid-cols-2"
        variants={staggerContainer(0.1)}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem} className="rounded-xl border border-border bg-surface-2 p-4">
          <div className="text-xs text-muted">Risque par trade</div>
          <div className="mt-1 text-xl font-semibold">
            <AnimatedNumber value={Math.round(riskAmount)} suffix={` ${plan.currency}`} />
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {plan.riskPerTradePct}% de {plan.accountSize.toLocaleString("fr-FR")} {plan.currency}
          </div>
        </motion.div>
        <motion.div variants={staggerItem} className="rounded-xl border border-accent/40 bg-accent/10 p-4">
          <div className="text-xs text-muted">Win rate d&apos;équilibre — seuil de rentabilité (RR {plan.minRiskReward})</div>
          <div className="mt-1 text-xl font-semibold text-accent">
            {breakEven !== null ? (
              <AnimatedNumber value={Math.round(breakEven * 100)} suffix="%" locale="" />
            ) : (
              "—"
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            C&apos;est le taux de réussite à partir duquel ton système gagne de l&apos;argent.
          </div>
        </motion.div>
      </motion.div>

      {breakEven !== null && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-surface-2 p-3 text-xs">
          <span className="text-accent">↑</span>
          <span className="text-muted">
            <b className="text-accent">Au-dessus de {Math.round(breakEven * 100)}%</b> de win rate → tu es rentable.{" "}
            <b className="text-danger">En dessous</b> → ton système perd de l&apos;argent sur la durée,
            même avec quelques trades gagnants. Vise une marge confortable au-dessus du seuil.
          </span>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="py-2 pr-3 font-medium">Win rate</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">Espérance / trade</th>
              <th className="px-3 py-2 font-medium">Sur {PROJECTION_TRADES} trades</th>
              <th className="py-2 pl-3 text-right font-medium">Capital final</th>
            </tr>
          </thead>
          <motion.tbody variants={staggerContainer(0.04)} initial="hidden" animate="visible">
            {rows.map((r) => {
              const t = r.isBreakEven ? "text-muted" : r.pnl >= 0 ? "text-accent" : "text-danger";
              const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");
              return (
                <motion.tr key={r.winRate} variants={staggerItem} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3">
                    <span className="font-medium">{Math.round(r.winRate * 100)}%</span>
                    {r.isBreakEven && (
                      <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">équilibre</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-2.5 tabular-nums text-muted sm:table-cell">
                    {sign(r.expectancyR)}{Math.abs(r.expectancyR).toFixed(2)}R
                  </td>
                  <td className={`px-3 py-2.5 font-medium tabular-nums ${t}`}>
                    {sign(r.totalR)}{Math.abs(r.totalR).toFixed(1)}R
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums">
                    <div className="font-semibold">
                      {Math.round(r.finalCapital).toLocaleString("fr-FR")} {plan.currency}
                    </div>
                    <div className={`text-xs ${t}`}>
                      {sign(r.pnl)}{Math.abs(Math.round(r.pnl)).toLocaleString("fr-FR")} {plan.currency} ·{" "}
                      {sign(r.pnlPct)}{Math.abs(r.pnlPct).toFixed(1)}%
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </motion.tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">
        Horizon de {PROJECTION_TRADES} trades, à risque constant. C&apos;est une espérance statistique
        (hors frais, spread et slippage), pas une garantie.
      </p>
    </Section>
  );
}

/* ============================================================
 * Vue d'ensemble du plan établi (mode lecture).
 * Affiche toutes les règles, conditions et données + un forecast
 * interactif sur 30 trades + la projection de rentabilité.
 * ============================================================ */
function PlanOverview({
  plan,
  onEdit,
  onReset,
}: {
  plan: TradingPlan;
  onEdit: () => void;
  onReset: () => void;
}) {
  const profile = classifyRiskProfile(plan);
  const tone = {
    ok: "border-accent/40 bg-accent/10",
    warn: "border-warning/40 bg-warning/10",
    fail: "border-danger/40 bg-danger/10",
  }[profile.tone];

  const assets = plan.assets.filter(Boolean);
  const sessions = SESSIONS.filter((s) => plan.sessions.includes(s.key));
  const confirmations = [
    ...ENTRY_CONDITIONS.filter((c) => plan.enabledConditions.includes(c.key)).map((c) => c.label),
    ...plan.customConditions,
  ];
  const emotions = EMOTIONS.filter((e) => plan.blockingEmotions.includes(e));
  const indices = WATCH_INDICES.filter((i) => plan.watchIndices.includes(i.key));

  const pct = (n: number) => `${Number(n.toFixed(2))}%`;
  const mmRows: { label: string; value: string }[] = [
    { label: "Capital", value: `${plan.accountSize.toLocaleString("fr-FR")} ${plan.currency}` },
    { label: "Risque / trade", value: pct(plan.riskPerTradePct) },
    { label: "RR minimum", value: plan.minRiskReward.toFixed(1) },
    { label: "Win rate attendu", value: `${plan.expectedWinRate}%` },
    { label: "Trades / jour", value: `${plan.maxTradesPerDay} max` },
    { label: "Gain max / jour", value: pct(plan.maxDailyGainPct) },
    { label: "Perte max / jour", value: `-${pct(plan.maxDailyLossPct)}` },
    { label: "Objectif / semaine", value: pct(plan.maxWeeklyGainPct) },
    { label: "Perte max / semaine", value: `-${pct(plan.maxWeeklyLossPct)}` },
    { label: "Objectif mensuel", value: pct(plan.monthlyTargetPct) },
    { label: "Risque ouvert max", value: pct(plan.maxOpenRiskPct) },
    { label: "Kill-switch (DD max)", value: `-${pct(plan.maxAccountDrawdownPct)}` },
  ];

  return (
    <div className="space-y-6 animate-stagger">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Mon plan de trading</h1>
          <p className="mt-1 text-sm text-muted">
            Ton plan est établi. Voici tes règles, ta projection et ton forecast.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:text-danger"
          >
            Réinitialiser
          </button>
          <MagneticButton
            onClick={onEdit}
            className="btn-primary rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            ✎ Modifier
          </MagneticButton>
        </div>
      </div>

      {/* Profil + money management */}
      <Reveal as="section" className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-accent">Règles & money management</p>
            <h2 className="mt-1 text-lg font-semibold">{plan.memberName || "Le socle de ton plan"}</h2>
          </div>
          <Badge tone={profile.tone}>Profil {profile.label}</Badge>
        </div>

        <Stagger className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" stagger={0.03}>
          {mmRows.map((r) => (
            <StaggerChild key={r.label} className="rounded-xl border border-border bg-surface-2 p-3">
              <div className="text-xs text-muted">{r.label}</div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums">{r.value}</div>
            </StaggerChild>
          ))}
        </Stagger>

        <motion.div
          className={`mt-5 rounded-xl border p-4 ${tone}`}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={springSoft}
        >
          <p className="text-sm text-foreground">{profile.summary}</p>
        </motion.div>
      </Reveal>

      {/* Forecast interactif — 30 trades */}
      <TradesForecast plan={plan} />

      {/* Projection & rentabilité (réutilise le composant existant) */}
      <Reveal>
        <Projection plan={plan} />
      </Reveal>

      {/* Conditions de trading */}
      <Reveal as="section" className="card p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Conditions de trading</h2>
        <div className="mt-4 space-y-5">
          <ChipGroup label="États bloquants (psycho)" items={emotions} tone="danger" empty="aucun" />
          <ChipGroup
            label={`Confirmations exigées — min. ${plan.minConfluences}`}
            items={confirmations}
            tone="accent"
            empty="aucune"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">Sessions :</span>
            {sessions.length ? (
              sessions.map((s) => (
                <span key={s.key} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs">
                  {s.label} <span className="opacity-60">· {s.window}</span>
                </span>
              ))
            ) : (
              <span className="text-xs text-muted">aucune</span>
            )}
            <span className="ml-1 text-xs text-muted">· filtre news ±{plan.newsFilterMinutes} min</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">Actifs :</span>
            {assets.length ? (
              assets.map((a) => (
                <span key={a} className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">
                  {a}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted">aucun</span>
            )}
            {indices.length > 0 && (
              <>
                <span className="ml-2 text-xs font-medium text-muted">Indices :</span>
                {indices.map((i) => (
                  <span key={i.key} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs">
                    {i.key}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function ChipGroup({
  label,
  items,
  tone,
  empty,
}: {
  label: string;
  items: string[];
  tone: "accent" | "danger";
  empty: string;
}) {
  const cls =
    tone === "danger"
      ? "border-danger/40 bg-danger/10 text-danger"
      : "border-accent/40 bg-accent/10 text-accent";
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-muted">{label}</div>
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((it) => (
            <span key={it} className={`rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
              {it}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-xs text-muted">{empty}</span>
      )}
    </div>
  );
}

/* ============================================================
 * Forecast interactif sur 30 trades.
 * Win rate par défaut à 50 % ; les gains/pertes se recalculent en live.
 * ============================================================ */
function TradesForecast({ plan }: { plan: TradingPlan }) {
  const reduce = useReducedMotion();
  const [winRate, setWinRate] = useState(50);
  const fc = useMemo(
    () => simulateForecast(plan, winRate, FORECAST_TRADES),
    [plan, winRate],
  );
  const be = breakEvenWinRate(plan.minRiskReward);
  const up = fc.pnl >= 0;

  return (
    <Reveal as="section" className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Forecast — {FORECAST_TRADES} trades</h2>
          <p className="mt-1 max-w-md text-sm text-muted">
            Simulation à risque composé. Fais varier le win rate : les gains et les
            pertes s&apos;ajustent en direct.
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
            {Math.abs(Math.round(fc.pnl)).toLocaleString("fr-FR")} {plan.currency} · {up ? "+" : "−"}
            {Math.abs(fc.pnlPct).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="mt-5 max-w-sm">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">Win rate simulé</span>
          {be !== null && (
            <span className="text-xs text-muted">
              seuil de rentabilité ≈ {Math.round(be * 100)}%
            </span>
          )}
        </div>
        <Slider
          value={winRate}
          min={10}
          max={90}
          step={1}
          format={(v) => `${v}%`}
          onChange={setWinRate}
        />
      </div>

      <div className="mt-5">
        <ForecastMiniChart fc={fc} reduce={reduce} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FcTile label="Trades gagnants" tone="ok">
          <AnimatedNumber value={fc.wins} locale="" />
        </FcTile>
        <FcTile label="Trades perdants" tone="fail">
          <AnimatedNumber value={fc.losses} locale="" />
        </FcTile>
        <FcTile label="Drawdown max" tone="fail">
          <AnimatedNumber value={fc.maxDrawdownPct} decimals={1} prefix="-" suffix="%" />
        </FcTile>
        <FcTile label="Win rate simulé">
          <AnimatedNumber value={winRate} suffix="%" locale="" />
        </FcTile>
      </div>

      <p className="mt-3 text-xs text-muted">
        Départ {plan.accountSize.toLocaleString("fr-FR")} {plan.currency}, RR {plan.minRiskReward},
        risque {plan.riskPerTradePct}% par trade. Séquence simulée — l&apos;ordre réel varie,
        le résultat attendu reste cohérent.
      </p>
    </Reveal>
  );
}

function FcTile({
  label,
  tone,
  children,
}: {
  label: string;
  tone?: "ok" | "fail";
  children: React.ReactNode;
}) {
  const color = tone === "ok" ? "text-accent" : tone === "fail" ? "text-danger" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-0.5 block text-sm font-semibold tabular-nums ${color}`}>{children}</div>
    </div>
  );
}

// Courbe d'équité + barres de gains/pertes sur l'horizon du forecast.
// Le tracé se redessine quand le win rate change (clé dérivée de la forme).
function ForecastMiniChart({ fc, reduce }: { fc: Forecast; reduce: boolean | null }) {
  const W = 600;
  const H = 170;
  const pad = 10;
  const eqTop = 12;
  const eqBottom = 104;
  const barCenter = 140;
  const barMax = 22;

  const caps = [fc.start, ...fc.days.map((d) => d.capital)];
  const minCap = Math.min(...caps);
  const maxCap = Math.max(...caps);
  const capRange = maxCap - minCap || 1;
  const n = caps.length;
  const x = (i: number) => pad + (i / (n - 1)) * (W - 2 * pad);
  const yEq = (v: number) => eqBottom - ((v - minCap) / capRange) * (eqBottom - eqTop);

  const line = caps
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${yEq(v).toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${x(n - 1).toFixed(1)} ${eqBottom} L ${x(0).toFixed(1)} ${eqBottom} Z`;
  const up = fc.pnl >= 0;
  const stroke = up ? "var(--accent)" : "var(--danger)";

  const maxAbsPnl = Math.max(...fc.days.map((d) => Math.abs(d.pnl)), 1);
  const barW = ((W - 2 * pad) / fc.days.length) * 0.55;
  const drawKey = `${up ? "u" : "d"}-${fc.wins}-${minCap.toFixed(0)}-${maxCap.toFixed(0)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fcMiniArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad} x2={W - pad} y1={yEq(fc.start)} y2={yEq(fc.start)} stroke="var(--border)" strokeDasharray="3 4" />

      <motion.path
        key={`area-${drawKey}`}
        d={area}
        fill="url(#fcMiniArea)"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.3 }}
      />
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
          pathLength: { duration: 0.9, ease: EASE_SOFT },
          opacity: { duration: 0.25, ease: EASE_OUT },
        }}
      />
      <motion.circle
        key={`dot-${drawKey}`}
        cx={x(n - 1)}
        cy={yEq(caps[n - 1])}
        r={3.5}
        fill={stroke}
        initial={reduce ? false : { opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...springSnappy, delay: 0.85 }}
        style={{ transformOrigin: `${x(n - 1)}px ${yEq(caps[n - 1])}px` }}
      />

      {fc.days.map((d, i) => {
        const h = (Math.abs(d.pnl) / maxAbsPnl) * barMax;
        const cx = x(i + 1);
        const barH = Math.max(1, h);
        const y = d.win ? barCenter - barH : barCenter;
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
            transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.4 + i * 0.012 }}
            style={{ transformOrigin: `${cx}px ${barCenter}px` }}
          />
        );
      })}
      <line x1={pad} x2={W - pad} y1={barCenter} y2={barCenter} stroke="var(--border)" />
    </svg>
  );
}
