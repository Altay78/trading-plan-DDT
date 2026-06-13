import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// URL + clé "publishable" (anon) du projet Supabase DDT.
// Ces deux valeurs sont PUBLIQUES par conception : la clé publishable est de
// toute façon embarquée dans le bundle client envoyé au navigateur, et l'accès
// aux données est verrouillé par les Row Level Security de Supabase. On garde
// un fallback en dur pour que l'app fonctionne même si les variables d'env ne
// sont pas configurées sur l'hébergeur ; les variables d'env, si présentes,
// restent prioritaires (utile en local / pour pointer un autre projet).
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://gyfjjbooxmwryzdgrnjl.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_gX1oRXrVE1TlmYbztYDxzw_1QWAacWF";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}
