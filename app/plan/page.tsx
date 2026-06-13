"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
import { classifyRiskProfile, projectTrades } from "@/lib/calc";
import { usePlan } from "@/lib/usePlan";
import { Badge, Chip, Field, NumberInput, Section } from "@/components/ui";
import { Slider } from "@/components/Slider";
import {
  EASE_OUT,
  springSnappy,
  springSoft,
  springBouncy,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";
import { AnimatedNumber, MagneticButton } from "@/components/motion";

const PROJECTION_TRADES = 30;

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
  const { plan, loaded, save, update, reset } = usePlan();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [customInput, setCustomInput] = useState("");
  // Track navigation direction so the slide animation knows which way to go.
  const [direction, setDirection] = useState(1);
  const goToStep = (next: number) => {
    setDirection(next >= step ? 1 : -1);
    setStep(next);
  };

  if (!loaded) return <p className="text-sm text-muted">Chargement…</p>;

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
        <button
          onClick={() => {
            if (confirm("Réinitialiser le plan et tout recommencer ?")) {
              reset();
              setStep(0);
            }
          }}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:text-danger"
        >
          Réinitialiser
        </button>
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
              save(plan); // garantit la persistance du plan (exists = true)
              router.push("/");
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
