"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EMOTIONS, ENTRY_CONDITIONS, SESSIONS } from "@/lib/plan";
import { usePlan } from "@/lib/usePlan";
import { useJournal } from "@/lib/useJournal";
import {
  computeR,
  computeStats,
  outcomeOf,
  tradePnl,
  type TradeLog,
} from "@/lib/journal";
import { Badge, Chip, Field, NumberInput, Section, Toggle } from "@/components/ui";
import Sparkline from "@/components/Sparkline";

const conditionLabel = (key: string) =>
  ENTRY_CONDITIONS.find((c) => c.key === key)?.label ?? key;

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtCur = (n: number, c: string) =>
  `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n)).toLocaleString("fr-FR")} ${c}`;

type Draft = Omit<TradeLog, "id">;

function emptyDraft(riskPct: number, rrTarget: number): Draft {
  return {
    date: todayISO(),
    asset: "",
    direction: "buy",
    session: "",
    emotion: "",
    rrTarget,
    slPips: 0,
    rrResult: 0,
    riskPct,
    status: "closed",
    realizedAmount: null,
    followedPlan: true,
    confluences: [],
    notes: "",
  };
}

export default function JournalPage() {
  const { plan, loaded: planLoaded } = usePlan();
  const { trades, loaded, add, remove, update } = useJournal();
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft(1, 2));

  const stats = useMemo(() => computeStats(trades, plan), [trades, plan]);
  const draftR = computeR(draft);
  const draftPnl =
    draftR !== null ? (draftR * plan.accountSize * draft.riskPct) / 100 : null;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const canSave = draftR !== null && !!draft.asset;

  const save = () => {
    if (!canSave) return;
    add({ ...draft, id: crypto.randomUUID() });
    setDraft(emptyDraft(plan.riskPerTradePct, plan.minRiskReward));
    setShowForm(false);
  };

  const openForm = () => {
    setDraft(emptyDraft(plan.riskPerTradePct, plan.minRiskReward));
    setShowForm(true);
  };

  if (!loaded || !planLoaded) return <p className="text-sm text-muted">Chargement…</p>;

  const assetOptions = Array.from(
    new Set([...plan.assets.filter(Boolean), draft.asset].filter(Boolean)),
  );

  // Ouverts en premier, puis par date décroissante.
  const sorted = [...trades].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return b.date.localeCompare(a.date);
  });

  return (
    <div className="space-y-6 animate-stagger">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Journal de trades</h1>
          <p className="mt-1 text-sm text-muted">
            Logge tes trades, mesure ton respect du plan et ta performance en R.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openForm}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            + Trade passé
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="R cumulé" value={fmtR(stats.totalR)} tone={stats.totalR >= 0 ? "ok" : "fail"} />
          <StatCard label="Win rate" value={stats.winRate !== null ? `${Math.round(stats.winRate)}%` : "—"} />
          <StatCard label="R moyen / trade" value={stats.avgR !== null ? fmtR(stats.avgR) : "—"} />
          <StatCard
            label="Discipline"
            value={stats.disciplineScore !== null ? `${Math.round(stats.disciplineScore)}%` : "—"}
            tone={stats.disciplineScore !== null && stats.disciplineScore >= 80 ? "ok" : stats.disciplineScore !== null && stats.disciplineScore < 50 ? "fail" : undefined}
          />
        </div>
        <div className="card p-4">
          <div className="mb-1 flex items-center justify-between text-xs text-muted">
            <span>Courbe d&apos;équité (R cumulé)</span>
            <span className="text-foreground">
              {stats.count} clôturé{stats.count > 1 ? "s" : ""}
              {stats.open > 0 && <span className="text-warning"> · {stats.open} ouvert{stats.open > 1 ? "s" : ""}</span>}
            </span>
          </div>
          <Sparkline data={stats.cumR} />
          <div className="mt-1 text-xs text-muted">
            P&amp;L réalisé :{" "}
            <b className={stats.pnlEstimate >= 0 ? "text-accent" : "text-danger"}>
              {fmtCur(stats.pnlEstimate, plan.currency)}
            </b>
          </div>
        </div>
      </div>

      {/* Formulaire trade passé (déjà clôturé) */}
      {showForm && (
        <Section title="Logger un trade passé" description="Pour un trade déjà sorti. Pour un trade en cours, passe par le check pré-trade.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Date">
              <input type="date" className="input" value={draft.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
            <Field label="Actif">
              <select className="input" value={draft.asset} onChange={(e) => set("asset", e.target.value)}>
                <option value="">— choisir —</option>
                {assetOptions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </Field>
            <Field label="Sens">
              <div className="flex gap-2">
                <Chip active={draft.direction === "buy"} onClick={() => set("direction", "buy")}>Achat</Chip>
                <Chip active={draft.direction === "sell"} onClick={() => set("direction", "sell")} tone="danger">Vente</Chip>
              </div>
            </Field>
            <Field label="Session">
              <select className="input" value={draft.session} onChange={(e) => set("session", e.target.value)}>
                <option value="">— choisir —</option>
                {SESSIONS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="État psychologique">
              <select className="input" value={draft.emotion} onChange={(e) => set("emotion", e.target.value)}>
                <option value="">— choisir —</option>
                {EMOTIONS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </Field>
            <Field label="Risque" hint="% du capital">
              <NumberInput value={draft.riskPct} min={0} step={0.1} suffix="%" onChange={(v) => set("riskPct", v)} />
            </Field>
            <Field label="RR visé" hint="Le RR que tu visais">
              <NumberInput value={draft.rrTarget} min={0} step={0.1} suffix=": 1" onChange={(v) => set("rrTarget", v)} />
            </Field>
            <Field label="RR de sortie" hint="R réalisé — négatif si perdant (ex. -1)">
              <NumberInput value={draft.rrResult} step={0.1} suffix="R" onChange={(v) => set("rrResult", v)} />
            </Field>
          </div>

          {[...plan.enabledConditions, ...plan.customConditions].length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium">Confirmations présentes</div>
              <div className="flex flex-wrap gap-2">
                {[...plan.enabledConditions, ...plan.customConditions].map((key) => (
                  <Chip
                    key={key}
                    active={draft.confluences.includes(key)}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        confluences: d.confluences.includes(key)
                          ? d.confluences.filter((c) => c !== key)
                          : [...d.confluences, key],
                      }))
                    }
                  >
                    {conditionLabel(key)}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3">
            <div className="text-sm font-medium">J&apos;ai respecté mon plan</div>
            <Toggle checked={draft.followedPlan} onChange={(v) => set("followedPlan", v)} />
          </div>

          <div className="mt-4">
            <Field label="Notes" hint="Ce qui a bien marché, les erreurs, le contexte">
              <textarea
                className="input min-h-20 resize-y"
                value={draft.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Ex. Entrée sur OB H1 après sweep des lows asiatiques. Sorti un peu tôt."
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
            <span className="text-muted">Résultat :</span>
            {draftR !== null ? (
              <>
                <span className={`text-lg font-semibold ${draftR >= 0 ? "text-accent" : "text-danger"}`}>
                  {fmtR(draftR)}
                </span>
                <OutcomeBadge r={draftR} />
                {draftPnl !== null && (
                  <span className="text-muted">
                    ≈ <b className={draftPnl >= 0 ? "text-accent" : "text-danger"}>{fmtCur(draftPnl, plan.currency)}</b>
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted">Renseigne le RR de sortie</span>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={save}
              disabled={!canSave}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-40"
            >
              Enregistrer le trade
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted transition hover:text-foreground"
            >
              Annuler
            </button>
          </div>
        </Section>
      )}

      {/* Liste */}
      {trades.length === 0 ? (
        <div className="card grid place-items-center gap-2 p-10 text-center">
          <div className="text-sm font-medium">Aucun trade encore</div>
          <p className="max-w-sm text-sm text-muted">
            Lance un{" "}
            <Link href="/trade" className="text-accent">check pré-trade</Link> puis clique
            « Logger ce trade » — il apparaîtra ici en <b>ouvert</b>, prêt à être clôturé.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-border overflow-hidden">
          {sorted.map((t) => (
            <TradeRow
              key={t.id}
              trade={t}
              currency={plan.currency}
              accountSize={plan.accountSize}
              onClose={(rrResult, realizedAmount) =>
                update(t.id, { status: "closed", rrResult, realizedAmount })
              }
              onRemove={() => remove(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TradeRow({
  trade,
  currency,
  accountSize,
  onClose,
  onRemove,
}: {
  trade: TradeLog;
  currency: string;
  accountSize: number;
  onClose: (rrResult: number, realizedAmount: number) => void;
  onRemove: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const r = computeR(trade);
  const isOpen = trade.status === "open";
  const riskAmount = (accountSize * trade.riskPct) / 100;
  const pnl = tradePnl(trade, accountSize);

  return (
    <div className="px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <div className="shrink-0 text-xs tabular-nums text-muted">{trade.date}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{trade.asset || "—"}</div>
          <div className="text-xs text-muted">
            {trade.direction === "buy" ? "▲ Achat" : "▼ Vente"}
            {isOpen && <span> · RR visé {trade.rrTarget.toFixed(1)}{trade.slPips > 0 && ` · SL ${trade.slPips} pips`}</span>}
          </div>
        </div>
        {isOpen ? (
          <button
            onClick={() => setClosing((v) => !v)}
            className="shrink-0 rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
          >
            {closing ? "Fermer" : "Clôturer"}
          </button>
        ) : (
          <div className="shrink-0 text-right">
            <div className={`text-sm font-semibold ${r !== null && r >= 0 ? "text-accent" : "text-danger"}`}>
              {r !== null ? fmtR(r) : "—"}
            </div>
            <div className="text-xs text-muted">
              {trade.realizedAmount !== null ? fmtCur(trade.realizedAmount, currency) : fmtCur(pnl, currency)}
            </div>
          </div>
        )}
        <button
          onClick={onRemove}
          className="shrink-0 rounded-lg px-1.5 py-1 text-xs text-muted transition hover:text-danger"
          aria-label="Supprimer"
        >
          ✕
        </button>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        {isOpen ? (
          <Badge tone="warn">Ouvert</Badge>
        ) : trade.followedPlan ? (
          <Badge tone="ok">Plan suivi</Badge>
        ) : (
          <Badge tone="fail">Hors plan</Badge>
        )}
        {(trade.emotion || trade.notes) && (
          <span className="min-w-0 flex-1 truncate text-xs text-muted">
            {trade.emotion && <span className="text-foreground">{trade.emotion}</span>}
            {trade.emotion && trade.notes && " · "}
            {trade.notes}
          </span>
        )}
      </div>

      {closing && isOpen && (
        <ClosePanel
          rrTarget={trade.rrTarget}
          riskAmount={riskAmount}
          currency={currency}
          onCancel={() => setClosing(false)}
          onConfirm={(rrResult, amount) => {
            onClose(rrResult, amount);
            setClosing(false);
          }}
        />
      )}
    </div>
  );
}

function ClosePanel({
  rrTarget,
  riskAmount,
  currency,
  onCancel,
  onConfirm,
}: {
  rrTarget: number;
  riskAmount: number;
  currency: string;
  onCancel: () => void;
  onConfirm: (rrResult: number, realizedAmount: number) => void;
}) {
  const [phase, setPhase] = useState<"rr" | "amount">("rr");
  const [rr, setRr] = useState<number>(rrTarget);
  const [amount, setAmount] = useState<number>(0);

  const computedAmount = rr * riskAmount; // riskAmount = perte encourue à −1R
  const goAmount = () => {
    setAmount(Math.round(rr * riskAmount));
    setPhase("amount");
  };

  return (
    <div className="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
      {phase === "rr" ? (
        <>
          <div className="text-sm font-semibold">Quel RR as-tu réalisé ?</div>
          <p className="mt-1 text-xs text-muted">
            Le R de sortie, signé : −1 si ton SL a été touché, +{rrTarget.toFixed(1)} si le TP a été atteint.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip active={rr === -1} onClick={() => setRr(-1)} tone="danger">SL touché (−1R)</Chip>
            <Chip active={rr === 0} onClick={() => setRr(0)}>Break-even (0)</Chip>
            <Chip active={rr === rrTarget} onClick={() => setRr(rrTarget)}>TP atteint (+{rrTarget.toFixed(1)}R)</Chip>
          </div>
          <div className="mt-3 max-w-[180px]">
            <NumberInput value={rr} step={0.1} suffix="R" onChange={setRr} />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={goAmount}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
            >
              Continuer →
            </button>
            <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:text-foreground">
              Annuler
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-sm font-semibold">Est-ce bien ce montant qui a été réalisé ?</div>
          <p className="mt-1 text-xs text-muted">
            Avec {rr >= 0 ? "+" : "−"}{Math.abs(rr).toFixed(2)}R, l&apos;estimation théorique est{" "}
            <b className={computedAmount >= 0 ? "text-accent" : "text-danger"}>
              {fmtCur(computedAmount, currency)}
            </b>
            . Ajuste si le réel diffère (spread, frais, sortie partielle…).
          </p>
          <div className="mt-3 max-w-[220px]">
            <Field label="Montant réellement réalisé">
              <NumberInput value={amount} step={1} suffix={currency} onChange={setAmount} />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onConfirm(rr, amount)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
            >
              ✓ Clôturer le trade
            </button>
            <button onClick={() => setPhase("rr")} className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:text-foreground">
              ← Retour
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function fmtR(r: number) {
  return `${r >= 0 ? "+" : ""}${r.toFixed(2)}R`;
}

function StatCard({
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
    <div className="card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function OutcomeBadge({ r }: { r: number }) {
  const o = outcomeOf(r);
  if (o === "win") return <Badge tone="ok">Gagnant</Badge>;
  if (o === "loss") return <Badge tone="fail">Perdant</Badge>;
  return <Badge tone="muted">Break-even</Badge>;
}
