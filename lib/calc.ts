// Logique du "gate" pré-trade : calcule RR, taille de position,
// et évalue le trade contre le plan du membre.

import type { TradingPlan, WithdrawalStrategy } from "./plan";

export type TradeInput = {
  asset: string;
  direction: "buy" | "sell";
  session: string;
  emotion: string;
  newsClear: boolean;
  checkedConditions: string[];
  rrTarget: number; // RR visé (saisi directement)
  slPips: number; // taille du stop en pips
  openRiskPct: number; // risque déjà engagé sur les positions ouvertes
  accountDrawdownPct: number; // drawdown actuel du compte
  // Renseignés automatiquement depuis le journal (trades du jour)
  tradesTakenToday: number;
  dailyPnlPct: number;
};

export const EMPTY_TRADE: TradeInput = {
  asset: "",
  direction: "buy",
  session: "",
  emotion: "",
  newsClear: false,
  checkedConditions: [],
  rrTarget: 0,
  slPips: 0,
  openRiskPct: 0,
  accountDrawdownPct: 0,
  tradesTakenToday: 0,
  dailyPnlPct: 0,
};

export type RiskMath = {
  rr: number | null; // RR visé
  slPips: number;
  tpPips: number | null; // pips jusqu'au TP = slPips × RR
  riskAmount: number; // montant risqué (devise)
  rewardAmount: number; // gain potentiel (devise)
  valuePerPip: number | null; // valeur d'un pip (devise) pour respecter le risque
};

export function computeRiskMath(plan: TradingPlan, t: TradeInput): RiskMath {
  const rr = t.rrTarget > 0 ? t.rrTarget : null;
  const slPips = t.slPips > 0 ? t.slPips : 0;
  const tpPips = rr !== null && slPips > 0 ? slPips * rr : null;

  const riskAmount = (plan.accountSize * plan.riskPerTradePct) / 100;
  const rewardAmount = rr !== null ? riskAmount * rr : 0;
  // Valeur par pip pour ne risquer que `riskAmount` sur `slPips` pips.
  const valuePerPip = slPips > 0 ? riskAmount / slPips : null;

  return { rr, slPips, tpPips, riskAmount, rewardAmount, valuePerPip };
}

// Win rate d'équilibre (break-even) pour un Risk:Reward donné.
// Espérance nulle quand w·RR = (1−w) → w = 1 / (1 + RR).
export function breakEvenWinRate(rr: number): number | null {
  return rr > 0 ? 1 / (1 + rr) : null;
}

export type ProjectionRow = {
  winRate: number; // 0..1
  isBreakEven: boolean;
  expectancyR: number; // espérance par trade, en R
  totalR: number; // sur N trades
  pnl: number; // résultat en devise
  finalCapital: number;
  pnlPct: number;
};

// Projection à risque fixe par trade (non composé), hors frais/spread.
export function projectTrades(
  plan: Pick<TradingPlan, "accountSize" | "riskPerTradePct" | "minRiskReward">,
  trades: number,
): { riskAmount: number; breakEven: number | null; rows: ProjectionRow[] } {
  const riskAmount = (plan.accountSize * plan.riskPerTradePct) / 100;
  const rr = plan.minRiskReward;
  const be = breakEvenWinRate(rr);

  const rates =
    be === null
      ? [0.4, 0.5, 0.6, 0.7]
      : [be, be + 0.1, be + 0.2, be + 0.3]
          .map((w) => Math.min(0.95, w))
          .filter((w, i, a) => a.indexOf(w) === i);

  const snap = (x: number) => (Math.abs(x) < 1e-9 ? 0 : x);

  const rows: ProjectionRow[] = rates.map((w) => {
    const expectancyR = snap(w * rr - (1 - w));
    const totalR = snap(expectancyR * trades);
    const pnl = snap(totalR * riskAmount);
    return {
      winRate: w,
      isBreakEven: be !== null && Math.abs(w - be) < 1e-9,
      expectancyR,
      totalR,
      pnl,
      finalCapital: plan.accountSize + pnl,
      pnlPct: plan.accountSize > 0 ? snap((pnl / plan.accountSize) * 100) : 0,
    };
  });

  return { riskAmount, breakEven: be, rows };
}

export type RiskProfile = {
  key: "safe" | "moderate" | "aggressive";
  label: string;
  tone: "ok" | "warn" | "fail";
  summary: string;
  score: number;
};

// Classe le trader selon son plan : prudent / modéré / agressif.
export function classifyRiskProfile(
  plan: Pick<
    TradingPlan,
    | "riskPerTradePct"
    | "maxDailyLossPct"
    | "maxTradesPerDay"
    | "minRiskReward"
    | "minConfluences"
    | "maxOpenRiskPct"
  >,
): RiskProfile {
  let s = 0;

  if (plan.maxOpenRiskPct >= 4) s += 1;
  else if (plan.maxOpenRiskPct <= 1.5) s -= 1;

  if (plan.riskPerTradePct >= 2) s += 2;
  else if (plan.riskPerTradePct > 1) s += 1;
  else if (plan.riskPerTradePct <= 0.5) s -= 1;

  if (plan.maxDailyLossPct >= 6) s += 2;
  else if (plan.maxDailyLossPct > 3) s += 1;
  else if (plan.maxDailyLossPct <= 2) s -= 1;

  if (plan.maxTradesPerDay >= 5) s += 2;
  else if (plan.maxTradesPerDay >= 3) s += 1;

  if (plan.minConfluences <= 1) s += 2;
  else if (plan.minConfluences === 2) s += 1;
  else if (plan.minConfluences >= 4) s -= 1;

  if (plan.minRiskReward < 1.5) s += 1;
  else if (plan.minRiskReward >= 3) s -= 1;

  if (s >= 4)
    return {
      key: "aggressive",
      label: "Agressif",
      tone: "fail",
      summary:
        "Gros risque par trade, peu de confirmations, beaucoup de trades : potentiel rapide mais drawdowns violents. À réserver à un capital que tu peux perdre.",
      score: s,
    };
  if (s <= 0)
    return {
      key: "safe",
      label: "Prudent",
      tone: "ok",
      summary:
        "Profil défensif : petit risque, RR exigeant, beaucoup de confirmations. Croissance plus lente mais régulière — fait pour durer.",
      score: s,
    };
  return {
    key: "moderate",
    label: "Modéré",
    tone: "warn",
    summary:
      "Bon équilibre entre prise de risque et discipline. Le compromis le plus tenable sur la durée.",
    score: s,
  };
}

// Conseils de garde-fous adaptés au profil de trader.
export function guardrailAdvice(profile: RiskProfile): string[] {
  if (profile.key === "aggressive")
    return [
      "Ton profil est agressif : un seul mauvais run peut creuser vite. Coupe la journée dès la perte max atteinte, sans exception.",
      "Évite d'empiler plusieurs trades ouverts en même temps — ton risque ouvert grimpe d'un coup.",
      "Après 2 pertes d'affilée, lève le pied : baisse la taille ou arrête, c'est souvent là que la revanche s'installe.",
    ];
  if (profile.key === "safe")
    return [
      "Profil prudent : tes garde-fous sont serrés, c'est sain. Respecte-les surtout les jours où tu te sens « en forme ».",
      "Tu peux te permettre de laisser courir un trade gagnant — ton risque par trade est faible.",
      "Le vrai risque pour toi, c'est l'ennui qui pousse à surtrader. Tiens-toi à ton nombre de trades max.",
    ];
  return [
    "Profil modéré : bon équilibre. Ton ennemi n°1 reste l'enchaînement de trades après une perte.",
    "Garde un œil sur le risque ouvert simultané — n'ouvre pas un 2ᵉ trade qui double ton exposition.",
    "Dès l'objectif de gain du jour atteint, t'arrêter protège ta semaine.",
  ];
}

// ---- Forecast réaliste (gains ET pertes, capital composé) -------------------

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ForecastDay = { day: number; capital: number; pnl: number; win: boolean };

export type Forecast = {
  start: number;
  days: ForecastDay[];
  finalCapital: number;
  pnl: number;
  pnlPct: number;
  wins: number;
  losses: number;
  maxDrawdownPct: number;
};

// Simulation déterministe (seed dérivé des paramètres → stable, pas de flicker).
export function simulateForecast(
  plan: Pick<TradingPlan, "accountSize" | "riskPerTradePct" | "minRiskReward">,
  winRatePct: number,
  days = 30,
): Forecast {
  const p = Math.max(0, Math.min(1, winRatePct / 100));
  const rr = plan.minRiskReward;
  const start = plan.accountSize;

  const winsCount = Math.round(days * p);
  const seq: boolean[] = [];
  for (let i = 0; i < days; i++) seq.push(i < winsCount);

  const seed = Math.round(winRatePct * 97 + rr * 131 + plan.riskPerTradePct * 53 + days);
  const rand = mulberry32(seed);
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [seq[i], seq[j]] = [seq[j], seq[i]];
  }

  let capital = start;
  let peak = start;
  let maxDd = 0;
  let wins = 0;
  let losses = 0;
  const out: ForecastDay[] = [];
  for (let i = 0; i < days; i++) {
    const risk = (capital * plan.riskPerTradePct) / 100;
    const win = seq[i];
    const pnl = win ? risk * rr : -risk;
    capital += pnl;
    if (win) wins++;
    else losses++;
    if (capital > peak) peak = capital;
    const dd = peak > 0 ? ((peak - capital) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
    out.push({ day: i + 1, capital, pnl, win });
  }

  return {
    start,
    days: out,
    finalCapital: capital,
    pnl: capital - start,
    pnlPct: start > 0 ? ((capital - start) / start) * 100 : 0,
    wins,
    losses,
    maxDrawdownPct: maxDd,
  };
}

export function recommendWithdrawal(
  plan: Pick<TradingPlan, "accountSize">,
): { strategy: WithdrawalStrategy; reason: string } {
  if (plan.accountSize < 5000)
    return {
      strategy: "compound",
      reason:
        "Petit capital : tout réinvestir pour le faire grossir d'abord. Les retraits viendront plus tard.",
    };
  if (plan.accountSize >= 20000)
    return {
      strategy: "mix",
      reason:
        "Capital confortable : réinvestis une partie pour continuer à grossir, et commence à te payer une part des gains.",
    };
  return {
    strategy: "mix",
    reason: "Capital intermédiaire : un mix garde la croissance tout en te versant un premier revenu.",
  };
}

export type Check = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  blocking: boolean; // true = bloque le trade, false = simple avertissement
};

export type Evaluation = {
  checks: Check[];
  math: RiskMath;
  valid: boolean; // tous les checks bloquants passent
  blockingFails: number;
  warnings: number;
};

export function evaluateTrade(plan: TradingPlan, t: TradeInput): Evaluation {
  const math = computeRiskMath(plan, t);
  const checks: Check[] = [];

  const planAssets = plan.assets.map((a) => a.trim()).filter(Boolean);
  checks.push({
    id: "asset",
    label: "Actif autorisé par le plan",
    ok: !!t.asset && planAssets.includes(t.asset),
    detail: t.asset
      ? `${t.asset} ${planAssets.includes(t.asset) ? "est dans" : "n'est PAS dans"} ta liste (${planAssets.join(", ") || "—"})`
      : "Sélectionne l'actif",
    blocking: true,
  });

  checks.push({
    id: "session",
    label: "Session à trader",
    ok: !!t.session && plan.sessions.includes(t.session),
    detail: t.session
      ? plan.sessions.includes(t.session)
        ? "Session valide"
        : "Hors de tes sessions définies"
      : "Sélectionne la session",
    blocking: true,
  });

  const emotionBlocked = plan.blockingEmotions.includes(t.emotion);
  checks.push({
    id: "psycho",
    label: "État psychologique",
    ok: !!t.emotion && !emotionBlocked,
    detail: !t.emotion
      ? "Renseigne ton état"
      : emotionBlocked
        ? `« ${t.emotion} » est un état bloquant → ne trade pas`
        : `« ${t.emotion} » — état OK`,
    blocking: true,
  });

  checks.push({
    id: "news",
    label: `Filtre news (±${plan.newsFilterMinutes} min)`,
    ok: t.newsClear,
    detail: t.newsClear
      ? "Pas de news high-impact imminente"
      : "Vérifie le calendrier économique avant d'entrer",
    blocking: true,
  });

  const validConfluences = t.checkedConditions.filter(
    (c) => plan.enabledConditions.includes(c as never) || plan.customConditions.includes(c),
  ).length;
  checks.push({
    id: "confluences",
    label: `Confirmations (min. ${plan.minConfluences})`,
    ok: validConfluences >= plan.minConfluences,
    detail:
      validConfluences === 0
        ? "Aucune confirmation — ne prends pas ce trade"
        : `${validConfluences} / ${plan.minConfluences} confirmation(s) réunie(s)`,
    blocking: true,
  });

  checks.push({
    id: "rr",
    label: `Risk:Reward (min. ${plan.minRiskReward.toFixed(1)})`,
    ok: math.rr !== null && math.rr >= plan.minRiskReward,
    detail:
      math.rr !== null
        ? `RR visé de ${math.rr.toFixed(2)} pour ce setup`
        : "Renseigne le RR visé",
    blocking: true,
  });

  checks.push({
    id: "trades_day",
    label: `Trades du jour (max ${plan.maxTradesPerDay})`,
    ok: t.tradesTakenToday < plan.maxTradesPerDay,
    detail: `${t.tradesTakenToday} déjà pris aujourd'hui`,
    blocking: true,
  });

  checks.push({
    id: "daily_loss",
    label: `Limite de perte journalière (-${plan.maxDailyLossPct}%)`,
    ok: t.dailyPnlPct > -plan.maxDailyLossPct,
    detail: `P&L du jour : ${t.dailyPnlPct > 0 ? "+" : ""}${t.dailyPnlPct}%`,
    blocking: true,
  });

  const totalOpenRisk = t.openRiskPct + plan.riskPerTradePct;
  checks.push({
    id: "open_risk",
    label: `Risque ouvert simultané (max ${plan.maxOpenRiskPct}%)`,
    ok: totalOpenRisk <= plan.maxOpenRiskPct + 1e-9,
    detail: `${t.openRiskPct}% déjà engagé + ${plan.riskPerTradePct}% ce trade = ${totalOpenRisk.toFixed(1)}%`,
    blocking: true,
  });

  checks.push({
    id: "drawdown",
    label: `Drawdown du compte (max ${plan.maxAccountDrawdownPct}%)`,
    ok: t.accountDrawdownPct < plan.maxAccountDrawdownPct,
    detail:
      t.accountDrawdownPct >= plan.maxAccountDrawdownPct
        ? "Kill-switch atteint — arrête de trader et réévalue"
        : `Drawdown actuel : ${t.accountDrawdownPct}%`,
    blocking: true,
  });

  // Avertissement non bloquant : objectif de gain atteint
  checks.push({
    id: "daily_gain",
    label: `Objectif de gain du jour (+${plan.maxDailyGainPct}%)`,
    ok: t.dailyPnlPct < plan.maxDailyGainPct,
    detail:
      t.dailyPnlPct >= plan.maxDailyGainPct
        ? "Objectif atteint — arrêter est souvent la meilleure décision"
        : "Pas encore atteint",
    blocking: false,
  });

  const blockingFails = checks.filter((c) => c.blocking && !c.ok).length;
  const warnings = checks.filter((c) => !c.blocking && !c.ok).length;

  return {
    checks,
    math,
    valid: blockingFails === 0,
    blockingFails,
    warnings,
  };
}
