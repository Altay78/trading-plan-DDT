// Modèle de données du plan de trading.
// Structuré "plat" pour mapper directement vers une table Supabase plus tard.

export type EntryConditionKey =
  | "trendline_break"
  | "bos"
  | "structure_wm"
  | "sr_break"
  | "fibo"
  | "fvg"
  | "order_block"
  | "liquidity_sweep"
  | "choch"
  | "candle_confirmation";

export const ENTRY_CONDITIONS: {
  key: EntryConditionKey;
  label: string;
  hint: string;
}[] = [
  { key: "bos", label: "BOS — Break of Structure", hint: "Cassure de la structure de marché" },
  { key: "choch", label: "CHoCH — Change of Character", hint: "Premier signe de retournement" },
  { key: "trendline_break", label: "Cassure de trendline", hint: "Rupture d'une ligne de tendance" },
  { key: "sr_break", label: "Cassure résistance / support", hint: "Niveau horizontal clé franchi" },
  { key: "structure_wm", label: "Structure d'entrée (W / M)", hint: "Double bottom / double top" },
  { key: "fibo", label: "Niveau Fibo important", hint: "61.8 % / zone OTE 0.62–0.79" },
  { key: "fvg", label: "FVG / Imbalance", hint: "Déséquilibre de prix à combler" },
  { key: "order_block", label: "Order Block", hint: "Dernière bougie avant l'impulsion" },
  { key: "liquidity_sweep", label: "Prise de liquidité (sweep)", hint: "Mèche qui balaie un sommet/creux" },
  { key: "candle_confirmation", label: "Confirmation bougie", hint: "Engulfing / pin bar / rejet" },
];

export const EMOTIONS = [
  "Calme / focus",
  "Heureux",
  "Euphorique",
  "Triste",
  "FOMO",
  "Pressé",
  "Stressé",
  "En colère / revanche",
  "Fatigué",
] as const;

export const FINANCIAL_STATES = [
  "Stable financièrement",
  "Confort",
  "Besoin d'argent",
  "Sous pression",
] as const;

export const SESSIONS: { key: string; label: string; window: string }[] = [
  { key: "asia", label: "Asie", window: "01:00–09:00" },
  { key: "london", label: "Londres", window: "09:00–12:00" },
  { key: "ny", label: "US / New York", window: "14:30–18:00" },
  { key: "ny_overlap", label: "Overlap Londres/US", window: "14:30–17:00" },
];

export const WATCH_INDICES: { key: string; label: string; note: string }[] = [
  { key: "DXY", label: "DXY", note: "Indice dollar — corrélation inverse forte avec l'or et EUR/GBP·USD" },
  { key: "VIX", label: "VIX", note: "Volatilité / sentiment risk-on / risk-off" },
  { key: "US10Y", label: "US10Y", note: "Rendement 10 ans — utile pour l'or" },
  { key: "SPX", label: "S&P 500", note: "Appétit pour le risque" },
  { key: "NDX", label: "Nasdaq", note: "Tech / risk-on" },
];

export const ASSET_CATALOG: { category: string; assets: string[] }[] = [
  { category: "Forex — majeures", assets: ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD"] },
  { category: "Forex — crosses", assets: ["EURJPY", "GBPJPY", "EURGBP", "AUDJPY", "EURAUD", "CADJPY"] },
  { category: "Commodités", assets: ["XAUUSD", "XAGUSD", "USOIL", "UKOIL"] },
  { category: "Indices", assets: ["US30", "NAS100", "SPX500", "GER40", "UK100", "JP225"] },
  { category: "Crypto", assets: ["BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "BNBUSD"] },
];

const INDEX_KEYS = ["US30", "NAS100", "SPX500", "GER40", "UK100", "JP225"];
const CRYPTO_KEYS = ["BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "BNBUSD"];

// Suggère des indices à surveiller en fonction des actifs choisis.
export function suggestIndices(assets: string[]): { key: string; reason: string }[] {
  const a = assets.map((s) => s.toUpperCase()).filter(Boolean);
  const has = (pred: (x: string) => boolean) => a.some(pred);
  const out = new Map<string, string>();

  if (has((x) => x.includes("USD") || x.startsWith("XAU") || x.startsWith("XAG")))
    out.set("DXY", "Tes actifs sont liés au dollar — le DXY donne le sens du billet vert.");
  if (has((x) => x.startsWith("XAU")))
    out.set("US10Y", "Pour l'or, les rendements 10 ans US pèsent fortement.");
  if (has((x) => INDEX_KEYS.includes(x) || CRYPTO_KEYS.includes(x)))
    out.set("VIX", "Indices/crypto = risk-on/off ; le VIX en est le thermomètre.");
  if (has((x) => INDEX_KEYS.includes(x)))
    out.set("SPX", "Le S&P 500 mène l'appétit pour le risque global.");

  return [...out.entries()].map(([key, reason]) => ({ key, reason }));
}

export type WithdrawalStrategy = "compound" | "withdraw" | "mix";

export const WITHDRAWAL_STRATEGIES: {
  key: WithdrawalStrategy;
  label: string;
  tagline: string; // résumé en une ligne
  desc: string; // ce que ça veut dire concrètement
  pros: string[];
  cons: string[];
  bestFor: string; // à qui ça convient
}[] = [
  {
    key: "compound",
    label: "Scaler le capital",
    tagline: "Tout réinvesti — le capital grossit le plus vite.",
    desc: "Tu ne retires rien. 100 % des gains restent sur le compte, donc chaque mois tu risques (et gagnes) sur une base plus grosse. C'est l'effet boule de neige.",
    pros: [
      "Croissance exponentielle : les intérêts composés font le gros du travail",
      "Tu atteins ton objectif de capital beaucoup plus vite",
    ],
    cons: [
      "Zéro revenu tant que tu ne décides pas de retirer",
      "Un gros drawdown frappe un compte plus gros — pertes en valeur plus violentes",
    ],
    bestFor: "Petit / moyen capital que tu veux faire grossir avant d'en vivre.",
  },
  {
    key: "withdraw",
    label: "Retirer régulièrement",
    tagline: "Tu sors une part des gains chaque mois (revenu).",
    desc: "Chaque mois rentable, tu retires une partie des gains. Le capital reste à peu près stable, tu transformes le trading en revenu régulier.",
    pros: [
      "Tu te paies — le trading devient un vrai revenu",
      "Tu sécurises les gains hors du marché (à l'abri d'un futur drawdown)",
    ],
    cons: [
      "Le capital ne grossit quasiment plus → croissance lente voire nulle",
      "Tu plafonnes : tes gains en valeur restent calés sur le même capital",
    ],
    bestFor: "Capital déjà confortable, dont tu veux vivre dès maintenant.",
  },
  {
    key: "mix",
    label: "Scaler + retirer",
    tagline: "Une partie réinvestie, une partie retirée.",
    desc: "Le compromis : tu retires une fraction des gains (revenu) et tu réinvestis le reste (croissance). Tu te paies tout en faisant grossir le compte, plus lentement.",
    pros: [
      "Un revenu maintenant ET un capital qui continue de grossir",
      "Plus souple : tu ajustes le curseur retrait/réinvesti selon tes besoins",
    ],
    cons: [
      "Croissance plus lente qu'en composant à 100 %",
      "Revenu plus faible qu'en retirant tout",
    ],
    bestFor: "La plupart des traders — équilibre revenu / croissance sur la durée.",
  },
];

export type TradingPlan = {
  version: number;
  memberName: string;

  // Money management
  accountSize: number;
  currency: string;
  mmDisplayUnit: "pct" | "cur"; // afficher les limites en % ou en devise
  riskPerTradePct: number;
  minRiskReward: number;
  maxDailyGainPct: number;
  maxDailyLossPct: number;
  maxWeeklyGainPct: number;
  maxWeeklyLossPct: number;
  maxTradesPerDay: number;
  maxConsecutiveLosses: number;
  maxOpenRiskPct: number; // risque cumulé max sur les positions ouvertes
  maxAccountDrawdownPct: number; // kill-switch : drawdown max du compte
  monthlyTargetPct: number; // objectif de gain mensuel

  // Forecast & plan de retrait
  expectedWinRate: number; // win rate attendu (%), pour le forecast
  withdrawalStrategy: WithdrawalStrategy;
  withdrawalRate: number; // % des gains retirés (withdraw / mix)
  capitalTarget: number; // objectif de capital (barre de progression)

  // Psycho
  blockingEmotions: string[];

  // Conditions d'entrée
  enabledConditions: EntryConditionKey[];
  customConditions: string[]; // confirmations perso ajoutées par le membre
  minConfluences: number;

  // Sessions & news
  sessions: string[];
  newsFilterMinutes: number;

  // Actifs (3 max)
  assets: string[];

  // Indices à surveiller
  watchIndices: string[];
};

export const DEFAULT_PLAN: TradingPlan = {
  version: 1,
  memberName: "",

  accountSize: 10000,
  currency: "€",
  mmDisplayUnit: "pct",
  riskPerTradePct: 1,
  minRiskReward: 2,
  maxDailyGainPct: 3,
  maxDailyLossPct: 3,
  maxWeeklyGainPct: 6,
  maxWeeklyLossPct: 6,
  maxTradesPerDay: 3,
  maxConsecutiveLosses: 3,
  maxOpenRiskPct: 2,
  maxAccountDrawdownPct: 10,
  monthlyTargetPct: 10,

  expectedWinRate: 50,
  withdrawalStrategy: "mix",
  withdrawalRate: 30,
  capitalTarget: 25000,

  blockingEmotions: ["FOMO", "Pressé", "En colère / revanche", "Triste"],

  enabledConditions: ["bos", "structure_wm", "fibo", "order_block", "candle_confirmation"],
  customConditions: [],
  minConfluences: 3,

  sessions: ["london", "ny"],
  newsFilterMinutes: 15,

  assets: ["XAUUSD", "EURUSD", ""],

  watchIndices: ["DXY", "VIX"],
};

export const MAX_ASSETS = 3;
