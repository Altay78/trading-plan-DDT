"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const conditionLabel = (key: string) =>
  ENTRY_CONDITIONS.find((c) => c.key === key)?.label ?? key;

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtCur = (n: number, c: string) => `${Math.round(n).toLocaleString("fr-FR")} ${c}`;

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

  return (
    <div className="space-y-6 animate-stagger">
      <div>
        <h1 className="text-xl font-semibold">Check pré-trade</h1>
        <p className="mt-1 text-sm text-muted">
          Renseigne le setup. Le verdict se met à jour en direct selon{" "}
          <Link href="/plan" className="text-accent underline-offset-2 hover:underline">
            ton plan
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Colonne entrées */}
        <div className="space-y-6">
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

          <Section title="Confirmations d'entrée" description={`Coche les signaux présents. Minimum ${plan.minConfluences} — sinon, ne prends pas le trade.`}>
            {[...plan.enabledConditions, ...plan.customConditions].length === 0 ? (
              <p className="text-sm text-muted">
                Aucune confirmation définie. <Link href="/plan" className="text-accent">Configure ton plan</Link>.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[...plan.enabledConditions, ...plan.customConditions].map((key) => (
                  <Chip
                    key={key}
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
                ))}
              </div>
            )}
          </Section>

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

          <Section title="Garde-fous" description="Adaptés à ton profil. Le P&L et le nombre de trades du jour sont calculés automatiquement depuis ton journal.">
            <div className={`rounded-xl border p-4 ${
              profile.tone === "fail" ? "border-danger/40 bg-danger/10"
              : profile.tone === "ok" ? "border-accent/40 bg-accent/10"
              : "border-warning/40 bg-warning/10"
            }`}>
              <div className="flex items-center gap-2">
                <Badge tone={profile.tone}>Profil {profile.label}</Badge>
              </div>
              <ul className="mt-3 space-y-1.5">
                {advice.map((a, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="text-muted">→</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* État du jour (auto) */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="text-xs text-muted">P&amp;L du jour (auto)</div>
                <div className={`mt-0.5 text-base font-semibold ${
                  today.pnlAmount > 0 ? "text-accent" : today.pnlAmount < 0 ? "text-danger" : ""
                }`}>
                  {today.pnlAmount >= 0 ? "+" : "−"}{fmtCur(Math.abs(today.pnlAmount), plan.currency)}
                  <span className="ml-1 text-xs font-normal text-muted">
                    ({today.pnlPct >= 0 ? "+" : "−"}{Math.abs(today.pnlPct).toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="text-xs text-muted">Trades pris aujourd&apos;hui (auto)</div>
                <div className="mt-0.5 text-base font-semibold">
                  {today.tradesTaken} <span className="text-xs font-normal text-muted">/ {plan.maxTradesPerDay} max</span>
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
        </div>

        {/* Colonne verdict */}
        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Verdict result={evalResult} plan={plan} />
          <button
            onClick={logTrade}
            disabled={!t.asset}
            className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold transition hover:border-accent/50 hover:text-foreground disabled:opacity-40"
          >
            Logger ce trade (ouvert) →
          </button>
          <p className="px-1 text-xs text-muted">
            Le trade est enregistré comme <b className="text-foreground">ouvert</b>. Tu le clôtureras
            depuis le journal une fois sorti.
          </p>
        </div>
      </div>
    </div>
  );
}

function LevelsPreview({ plan, t }: { plan: ReturnType<typeof usePlan>["plan"]; t: TradeInput }) {
  const math = computeRiskMath(plan, t);
  if (math.rr === null || math.slPips === 0) {
    return (
      <p className="mt-3 text-xs text-muted">
        Renseigne le RR visé et la taille du stop pour voir le take-profit et la valeur par pip.
      </p>
    );
  }
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Mini label="Pips SL" value={`${math.slPips.toLocaleString("fr-FR")}`} />
      <Mini label="Pips TP" value={math.tpPips !== null ? `${Math.round(math.tpPips).toLocaleString("fr-FR")}` : "—"} tone="ok" />
      <Mini label="Risque" value={fmtCur(math.riskAmount, plan.currency)} tone="fail" />
      <Mini label="Gain visé" value={fmtCur(math.rewardAmount, plan.currency)} tone="ok" />
      {math.valuePerPip !== null && (
        <div className="col-span-2 rounded-xl border border-accent/30 bg-accent/5 p-3 sm:col-span-4">
          <div className="text-xs text-muted">Valeur par pip pour respecter ton risque</div>
          <div className="mt-0.5 text-sm">
            <b className="text-foreground">{math.valuePerPip.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {plan.currency}/pip</b>
            <span className="text-muted"> — {math.slPips} pips de SL × RR {math.rr?.toFixed(1)} = {math.tpPips !== null ? Math.round(math.tpPips) : "—"} pips jusqu&apos;au TP</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "ok" | "fail" }) {
  const color = tone === "ok" ? "text-accent" : tone === "fail" ? "text-danger" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${color}`}>{value}</div>
    </div>
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
      <div
        key={valid ? "valid" : "blocked"}
        className={`verdict-in p-5 ${valid ? "bg-accent/10" : "bg-danger/10"}`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-2xl ${valid ? "text-accent" : "text-danger"}`}>
            {valid ? "✅" : "⛔"}
          </span>
          <div>
            <div className={`text-lg font-semibold ${valid ? "text-accent" : "text-danger"}`}>
              {valid ? "Trade valide" : "Trade bloqué"}
            </div>
            <div className="text-xs text-muted">
              {valid
                ? warnings > 0
                  ? `${warnings} avertissement(s) à considérer`
                  : "Toutes les règles respectées"
                : `Ne prends pas ce trade · ${blockingFails} règle(s) non respectée(s)`}
            </div>
          </div>
        </div>
      </div>

      {/* Maths */}
      <div className="grid grid-cols-3 divide-x divide-border border-y border-border text-center">
        <Stat label="RR visé" value={math.rr !== null ? math.rr.toFixed(2) : "—"} ok={math.rr !== null && math.rr >= plan.minRiskReward} />
        <Stat
          label="Risque"
          value={`${Math.round(math.riskAmount).toLocaleString("fr-FR")} ${plan.currency}`}
        />
        <Stat
          label="Gain visé"
          value={math.rr !== null ? `${Math.round(math.rewardAmount).toLocaleString("fr-FR")} ${plan.currency}` : "—"}
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
      <ul className="divide-y divide-border">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-3 px-5 py-2.5">
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
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="px-2 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-base font-semibold ${ok === undefined ? "" : ok ? "text-accent" : "text-danger"}`}>
        {value}
      </div>
    </div>
  );
}
