"use client";

import { useCallback, useEffect, useState } from "react";
import type { TradeLog } from "./journal";
import { useAuth } from "./auth";
import { getSupabase } from "./supabase";

const STORAGE_KEY = "trading-plan:journal:v1";

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToTrade(r: any): TradeLog {
  return {
    id: r.id,
    date: r.date,
    asset: r.asset ?? "",
    direction: r.direction === "sell" ? "sell" : "buy",
    session: r.session ?? "",
    emotion: r.emotion ?? "",
    rrTarget: r.rr_target ?? 0,
    slPips: r.sl_pips ?? 0,
    rrResult: r.rr_result ?? 0,
    riskPct: r.risk_pct ?? 0,
    status: r.status === "open" ? "open" : "closed",
    realizedAmount: r.realized_amount ?? null,
    followedPlan: !!r.followed_plan,
    confluences: r.confluences ?? [],
    notes: r.notes ?? "",
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function tradeToRow(t: TradeLog, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    date: t.date,
    asset: t.asset,
    direction: t.direction,
    session: t.session,
    emotion: t.emotion,
    rr_target: t.rrTarget,
    sl_pips: t.slPips,
    rr_result: t.rrResult,
    risk_pct: t.riskPct,
    status: t.status,
    realized_amount: t.realizedAmount,
    followed_plan: t.followedPlan,
    confluences: t.confluences,
    notes: t.notes,
  };
}

export function useJournal() {
  const { session, loading: authLoading } = useAuth();
  const [trades, setTrades] = useState<TradeLog[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Chargement (localStorage en mode local, Supabase si configuré).
  useEffect(() => {
    let active = true;
    setLoaded(false);

    async function load() {
      if (authLoading) return;
      if (!session) {
        if (active) { setTrades([]); setLoaded(true); }
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        let parsed: TradeLog[] = [];
        try {
          const raw = localStorage.getItem(`${STORAGE_KEY}:${session.user.id}`);
          if (raw) parsed = JSON.parse(raw) as TradeLog[];
        } catch { /* ignore */ }
        if (active) { setTrades(parsed); setLoaded(true); }
        return;
      }

      const { data } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (active) {
        setTrades((data ?? []).map(rowToTrade));
        setLoaded(true);
      }
    }

    load();
    return () => { active = false; };
  }, [authLoading, session?.user?.id]);

  // Persistance locale : on suit l'état `trades` (source de vérité unique).
  // Gardé par `loaded` pour ne jamais écraser le stockage avant le chargement.
  useEffect(() => {
    if (!loaded || !session) return;
    if (getSupabase()) return; // mode Supabase : la persistance se fait par mutation
    try {
      localStorage.setItem(`${STORAGE_KEY}:${session.user.id}`, JSON.stringify(trades));
    } catch { /* ignore */ }
  }, [trades, loaded, session?.user?.id]);

  const add = useCallback(
    async (trade: TradeLog) => {
      setTrades((prev) => [trade, ...prev]);
      const supabase = getSupabase();
      if (supabase && session) {
        await supabase.from("trades").insert(tradeToRow(trade, session.user.id));
      }
    },
    [session?.user?.id],
  );

  const remove = useCallback(
    async (id: string) => {
      setTrades((prev) => prev.filter((t) => t.id !== id));
      const supabase = getSupabase();
      if (supabase && session) {
        await supabase.from("trades").delete().eq("id", id).eq("user_id", session.user.id);
      }
    },
    [session?.user?.id],
  );

  const update = useCallback(
    async (id: string, patch: Partial<TradeLog>) => {
      let updated: TradeLog | null = null;
      setTrades((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          updated = { ...t, ...patch };
          return updated;
        }),
      );
      const supabase = getSupabase();
      if (supabase && session && updated) {
        await supabase.from("trades").update(tradeToRow(updated, session.user.id)).eq("id", id).eq("user_id", session.user.id);
      }
    },
    [session?.user?.id],
  );

  return { trades, loaded, add, remove, update };
}
