// Journal de trades : modèle + calculs (R multiple, stats, score de discipline).

import type { TradingPlan } from "./plan";

export type TradeStatus = "open" | "closed";

export type TradeLog = {
  id: string;
  date: string; // YYYY-MM-DD
  asset: string;
  direction: "buy" | "sell";
  session: string;
  emotion: string;
  rrTarget: number; // RR attendu (planifié)
  slPips: number; // taille du stop en pips (depuis le pré-check)
  rrResult: number; // RR de sortie = R réalisé, signé (-1 si SL touché)
  riskPct: number; // % du capital risqué sur ce trade
  status: TradeStatus; // ouvert (en cours) ou clôturé (résultat connu)
  realizedAmount: number | null; // P&L réel en devise, saisi/confirmé à la clôture
  followedPlan: boolean; // ai-je respecté mon plan ?
  confluences: string[];
  notes: string;
};

export type PendingTrade = Partial<
  Pick<
    TradeLog,
    "asset" | "direction" | "session" | "emotion" | "riskPct" | "confluences" | "rrTarget" | "slPips"
  >
>;

// R réalisé = RR de sortie, saisi directement (signé).
export function computeR(t: Pick<TradeLog, "rrResult">): number | null {
  return Number.isFinite(t.rrResult) ? t.rrResult : null;
}

export type Outcome = "win" | "loss" | "be";

export function outcomeOf(r: number | null): Outcome {
  if (r === null) return "be";
  if (r > 0.05) return "win";
  if (r < -0.05) return "loss";
  return "be";
}

// P&L réel d'un trade clôturé : montant confirmé si présent, sinon estimé via R.
export function tradePnl(t: TradeLog, accountSize: number): number {
  if (t.status !== "closed") return 0;
  if (t.realizedAmount !== null && Number.isFinite(t.realizedAmount)) return t.realizedAmount;
  const r = computeR(t) ?? 0;
  return (r * accountSize * t.riskPct) / 100;
}

export type JournalStats = {
  count: number; // trades clôturés
  open: number; // trades encore ouverts
  wins: number;
  losses: number;
  be: number;
  winRate: number | null; // 0–100
  totalR: number;
  avgR: number | null;
  disciplineScore: number | null; // 0–100, % de trades plan respecté
  pnlEstimate: number; // € réel/estimé (trades clôturés)
  cumR: number[]; // R cumulé, chronologique (pour la courbe d'équité)
};

export function computeStats(trades: TradeLog[], plan: TradingPlan): JournalStats {
  const closed = trades.filter((t) => t.status === "closed");
  const openCount = trades.length - closed.length;
  const chrono = [...closed].sort((a, b) => a.date.localeCompare(b.date));
  let wins = 0,
    losses = 0,
    be = 0,
    totalR = 0,
    followed = 0,
    pnl = 0;
  const cumR: number[] = [];
  let running = 0;

  for (const t of chrono) {
    const r = computeR(t) ?? 0;
    const o = outcomeOf(computeR(t));
    if (o === "win") wins++;
    else if (o === "loss") losses++;
    else be++;
    totalR += r;
    running += r;
    cumR.push(Number(running.toFixed(2)));
    if (t.followedPlan) followed++;
    pnl += tradePnl(t, plan.accountSize);
  }

  const decided = wins + losses;
  const count = chrono.length;
  return {
    count,
    open: openCount,
    wins,
    losses,
    be,
    winRate: decided > 0 ? (wins / decided) * 100 : null,
    totalR,
    avgR: count > 0 ? totalR / count : null,
    disciplineScore: count > 0 ? (followed / count) * 100 : null,
    pnlEstimate: pnl,
    cumR,
  };
}

// Stats du jour pour le check pré-trade (P&L auto + nombre de trades pris).
export function todayStats(
  trades: TradeLog[],
  plan: TradingPlan,
  isoDate: string,
): { tradesTaken: number; pnlAmount: number; pnlPct: number } {
  const today = trades.filter((t) => t.date === isoDate);
  const pnlAmount = today.reduce((sum, t) => sum + tradePnl(t, plan.accountSize), 0);
  return {
    tradesTaken: today.length,
    pnlAmount,
    pnlPct: plan.accountSize > 0 ? (pnlAmount / plan.accountSize) * 100 : 0,
  };
}
