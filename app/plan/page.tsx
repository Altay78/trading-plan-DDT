"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function PlanPage() {
  const { plan, loaded, save, update, reset } = usePlan();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [customInput, setCustomInput] = useState("");

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
            Étape {step + 1} / {STEPS.length}
          </span>
          <span className="text-muted">{current.title}</span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              aria-label={s.title}
              className={`h-1.5 flex-1 rounded-full transition ${
                i <= step ? "bg-accent" : "bg-surface-2"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Étape : Capital */}
      {current.id === "capital" && (
        <Section title="Capital & identité" description="On part de ton capital — tout le reste en découle.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nom du membre">
              <input
                className="input"
                value={plan.memberName}
                placeholder="Ex. Altay"
                onChange={(e) => update("memberName", e.target.value)}
              />
            </Field>
            <Field label="Capital du compte">
              <NumberInput value={plan.accountSize} min={0} suffix={plan.currency} onChange={(v) => update("accountSize", v)} />
            </Field>
            <Field label="Devise">
              <select className="input" value={plan.currency} onChange={(e) => update("currency", e.target.value)}>
                <option value="€">€ (EUR)</option>
                <option value="$">$ (USD)</option>
                <option value="£">£ (GBP)</option>
              </select>
            </Field>
          </div>
        </Section>
      )}

      {/* Étape : Money management */}
      {current.id === "mm" && (
        <Section title="Money management" description="Le socle. Le risque par trade et le RR minimum priment sur tout le reste.">
          <div className="grid gap-6 rounded-xl border border-border bg-surface-2 p-4 sm:grid-cols-3">
            <Field label="Risque par trade" hint="% du capital perdu si SL touché — jusqu'à 15% en compte propre">
              <Slider value={plan.riskPerTradePct} min={0.25} max={15} step={0.25} format={(v) => `${v}%`} onChange={(v) => update("riskPerTradePct", v)} />
            </Field>
            <Field label="Risk:Reward minimum" hint="Gain visé ÷ risque">
              <Slider value={plan.minRiskReward} min={1} max={5} step={0.1} format={(v) => `${v.toFixed(1)} : 1`} onChange={(v) => update("minRiskReward", v)} />
            </Field>
            <Field label="Win rate attendu" hint="Sert au forecast de l'accueil">
              <Slider value={plan.expectedWinRate} min={30} max={80} step={1} format={(v) => `${v}%`} onChange={(v) => update("expectedWinRate", v)} />
            </Field>
          </div>

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

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nombre de trades max / jour" hint="Au-delà → on arrête">
              <NumberInput value={plan.maxTradesPerDay} min={1} step={1} onChange={(v) => update("maxTradesPerDay", v)} />
            </Field>
            <MmLimit label="Gain max / jour" hint="Objectif atteint → arrête, c'est gagné" pct={plan.maxDailyGainPct} onChange={(v) => update("maxDailyGainPct", v)} unit={plan.mmDisplayUnit} accountSize={plan.accountSize} currency={plan.currency} />
            <MmLimit label="Perte max / jour" hint="Limite bloquante — stop la journée" pct={plan.maxDailyLossPct} onChange={(v) => update("maxDailyLossPct", v)} unit={plan.mmDisplayUnit} accountSize={plan.accountSize} currency={plan.currency} />
            <MmLimit label="Objectif de gain / semaine" pct={plan.maxWeeklyGainPct} onChange={(v) => update("maxWeeklyGainPct", v)} unit={plan.mmDisplayUnit} accountSize={plan.accountSize} currency={plan.currency} />
            <MmLimit label="Limite de perte / semaine" hint="Stop la semaine si atteinte" pct={plan.maxWeeklyLossPct} onChange={(v) => update("maxWeeklyLossPct", v)} unit={plan.mmDisplayUnit} accountSize={plan.accountSize} currency={plan.currency} />
            <MmLimit label="Objectif mensuel" hint="Ta cible de gain sur le mois" pct={plan.monthlyTargetPct} onChange={(v) => update("monthlyTargetPct", v)} unit={plan.mmDisplayUnit} accountSize={plan.accountSize} currency={plan.currency} step={1} />
            <MmLimit label="Risque ouvert max" hint="Cumul sur toutes les positions ouvertes" pct={plan.maxOpenRiskPct} onChange={(v) => update("maxOpenRiskPct", v)} unit={plan.mmDisplayUnit} accountSize={plan.accountSize} currency={plan.currency} />
            <Field label="Drawdown max (kill-switch)" hint="Toujours en % — on arrête tout">
              <NumberInput value={plan.maxAccountDrawdownPct} min={0} step={1} suffix="%" onChange={(v) => update("maxAccountDrawdownPct", v)} />
            </Field>
          </div>
        </Section>
      )}

      {/* Étape : Psycho */}
      {current.id === "psycho" && (
        <Section
          title="Psychologie — états bloquants"
          description="Sélectionne les états dans lesquels tu t'interdis de trader. Au check pré-trade, ils bloqueront l'entrée."
        >
          <div className="flex flex-wrap gap-2">
            {EMOTIONS.map((e) => (
              <Chip key={e} tone="danger" active={plan.blockingEmotions.includes(e)} onClick={() => update("blockingEmotions", toggle(plan.blockingEmotions, e))}>
                {e}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      {/* Étape : Confirmations */}
      {current.id === "confirm" && (
        <Section
          title="Confirmations d'entrée"
          description="Les signaux que tu exiges avant d'entrer. Au check pré-trade, il faudra en réunir le minimum — sinon le trade est refusé."
        >
          <div className="flex flex-wrap gap-2">
            {ENTRY_CONDITIONS.map((c) => (
              <Chip
                key={c.key}
                active={plan.enabledConditions.includes(c.key)}
                onClick={() => update("enabledConditions", toggle(plan.enabledConditions, c.key) as EntryConditionKey[])}
              >
                {c.label}
              </Chip>
            ))}
          </div>

          <div className="mt-5">
            <div className="mb-2 text-sm font-medium">Autre confirmation</div>
            {plan.customConditions.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {plan.customConditions.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent/15 px-3 py-1.5 text-sm text-accent"
                  >
                    {c}
                    <button onClick={() => removeCustom(c)} className="text-accent/60 transition hover:text-accent" aria-label="Retirer">
                      ✕
                    </button>
                  </span>
                ))}
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
          <div className="flex flex-wrap gap-2">
            {SESSIONS.map((s) => (
              <Chip key={s.key} active={plan.sessions.includes(s.key)} onClick={() => update("sessions", toggle(plan.sessions, s.key))}>
                {s.label} <span className="opacity-60">· {s.window}</span>
              </Chip>
            ))}
          </div>
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
              {assets.length ? (
                assets.map((a) => (
                  <span key={a} className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">{a}</span>
                ))
              ) : (
                <span className="text-xs text-muted">aucun</span>
              )}
              <span className="ml-auto text-xs text-muted">{assets.length}/{MAX_ASSETS}</span>
            </div>
            <div className="space-y-4">
              {ASSET_CATALOG.map((group) => (
                <div key={group.category}>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{group.category}</div>
                  <div className="flex flex-wrap gap-2">
                    {group.assets.map((a) => {
                      const selected = assets.includes(a);
                      const full = assets.length >= MAX_ASSETS;
                      return (
                        <Chip key={a} active={selected} disabled={!selected && full} onClick={() => selectAsset(a)}>
                          {a}
                        </Chip>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Indices à surveiller" description="Contexte macro. On te conseille selon tes actifs.">
            {suggested.length > 0 && (
              <div className="mb-4 rounded-xl border border-accent/40 bg-accent/10 p-4">
                <div className="mb-2 text-sm font-medium text-accent">Conseillés selon tes actifs</div>
                <div className="space-y-2">
                  {suggested.map((s) => {
                    const on = plan.watchIndices.includes(s.key);
                    return (
                      <div key={s.key} className="flex items-start gap-3">
                        <button
                          onClick={() => update("watchIndices", toggle(plan.watchIndices, s.key))}
                          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                            on ? "border-accent bg-accent text-accent-foreground" : "border-accent/50 text-accent"
                          }`}
                        >
                          {on ? "✓ " : "+ "}{s.key}
                        </button>
                        <span className="text-xs text-muted">{s.reason}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {WATCH_INDICES.map((idx) => {
                const active = plan.watchIndices.includes(idx.key);
                return (
                  <button
                    key={idx.key}
                    type="button"
                    onClick={() => update("watchIndices", toggle(plan.watchIndices, idx.key))}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      active ? "border-accent/50 bg-accent/10" : "border-border bg-surface-2"
                    }`}
                  >
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs ${active ? "border-accent bg-accent text-accent-foreground" : "border-border text-transparent"}`}>✓</span>
                    <span className="flex-1">
                      <span className="text-sm font-medium">{idx.label}</span>
                      <span className="ml-2 text-xs text-muted">{idx.note}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>
        </div>
      )}

      {/* Étape : Récap & profil */}
      {current.id === "recap" && <Recap plan={plan} />}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted transition hover:text-foreground disabled:opacity-30"
        >
          ← Précédent
        </button>
        {isLast ? (
          <button
            onClick={() => {
              save(plan); // garantit la persistance du plan (exists = true)
              router.push("/");
            }}
            className="btn-primary rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Terminer ✓
          </button>
        ) : (
          <button
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="btn-primary rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Suivant →
          </button>
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
        <div className={`rounded-xl border p-5 ${tone}`}>
          <div className="flex items-center gap-3">
            <Badge tone={profile.tone}>{profile.label}</Badge>
            <span className="text-xs text-muted">score {profile.score}</span>
          </div>
          <p className="mt-3 text-sm text-foreground">{profile.summary}</p>
        </div>
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <div className="text-xs text-muted">Risque par trade</div>
          <div className="mt-1 text-xl font-semibold">
            {Math.round(riskAmount).toLocaleString("fr-FR")} {plan.currency}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {plan.riskPerTradePct}% de {plan.accountSize.toLocaleString("fr-FR")} {plan.currency}
          </div>
        </div>
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-4">
          <div className="text-xs text-muted">Win rate d&apos;équilibre — seuil de rentabilité (RR {plan.minRiskReward})</div>
          <div className="mt-1 text-xl font-semibold text-accent">
            {breakEven !== null ? `${Math.round(breakEven * 100)}%` : "—"}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            C&apos;est le taux de réussite à partir duquel ton système gagne de l&apos;argent.
          </div>
        </div>
      </div>

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
          <tbody>
            {rows.map((r) => {
              const t = r.isBreakEven ? "text-muted" : r.pnl >= 0 ? "text-accent" : "text-danger";
              const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");
              return (
                <tr key={r.winRate} className="border-b border-border/60 last:border-0">
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">
        Horizon de {PROJECTION_TRADES} trades, à risque constant. C&apos;est une espérance statistique
        (hors frais, spread et slippage), pas une garantie.
      </p>
    </Section>
  );
}
