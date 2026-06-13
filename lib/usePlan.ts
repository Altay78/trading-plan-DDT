"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PLAN, type TradingPlan } from "./plan";
import { useAuth } from "./auth";
import { getSupabase } from "./supabase";

const STORAGE_KEY = "trading-plan:v1";

export function usePlan() {
  const { session, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<TradingPlan>(DEFAULT_PLAN);
  const [loaded, setLoaded] = useState(false);
  const [exists, setExists] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabaseAvailable = () => getSupabase() !== null;

  useEffect(() => {
    let active = true;
    setLoaded(false);

    async function load() {
      if (authLoading) return;
      if (!session) {
        if (active) { setPlan(DEFAULT_PLAN); setExists(false); setLoaded(true); }
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        // Mode localStorage
        try {
          const raw = localStorage.getItem(`${STORAGE_KEY}:${session.user.id}`);
          if (active) {
            if (raw) setPlan({ ...DEFAULT_PLAN, ...JSON.parse(raw) });
            setExists(!!raw);
          }
        } catch { /* ignore */ }
        if (active) setLoaded(true);
        return;
      }

      const { data } = await supabase
        .from("plans")
        .select("data")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (active) {
        setPlan(data?.data ? { ...DEFAULT_PLAN, ...(data.data as Partial<TradingPlan>) } : DEFAULT_PLAN);
        setExists(!!data);
        setLoaded(true);
      }
    }

    load();
    return () => { active = false; };
  }, [authLoading, session?.user?.id]);

  const persistRemote = useCallback(
    (next: TradingPlan) => {
      if (!session) return;
      const supabase = getSupabase();
      if (!supabase) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        supabase.from("plans").upsert({ user_id: session.user.id, data: next, updated_at: new Date().toISOString() }).then(() => {});
      }, 600);
    },
    [session?.user?.id],
  );

  const writeThrough = useCallback(
    (next: TradingPlan) => {
      setExists(true);
      if (!supabaseAvailable() && session) {
        try { localStorage.setItem(`${STORAGE_KEY}:${session.user.id}`, JSON.stringify(next)); }
        catch { /* ignore */ }
      } else {
        persistRemote(next);
      }
    },
    [session?.user?.id, persistRemote],
  );

  const save = useCallback((next: TradingPlan) => { setPlan(next); writeThrough(next); }, [writeThrough]);

  const update = useCallback(
    <K extends keyof TradingPlan>(key: K, value: TradingPlan[K]) => {
      setPlan((prev) => { const next = { ...prev, [key]: value }; writeThrough(next); return next; });
    },
    [writeThrough],
  );

  const reset = useCallback(() => {
    setPlan(DEFAULT_PLAN);
    setExists(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const supabase = getSupabase();
    if (!supabase && session) {
      try { localStorage.removeItem(`${STORAGE_KEY}:${session.user.id}`); } catch { /* ignore */ }
    } else if (supabase && session) {
      supabase.from("plans").delete().eq("user_id", session.user.id).then(() => {});
    }
  }, [session?.user?.id]);

  return { plan, loaded, exists, save, update, reset };
}
