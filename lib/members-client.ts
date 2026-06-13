"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Crée un compte membre via un client Supabase JETABLE :
// la session du mentor n'est pas touchée (persistSession: false).
export async function createMemberAccount(
  email: string,
  password: string,
  name: string,
): Promise<{ error: string | null }> {
  if (!url || !anon) return { error: "Supabase non configuré." };
  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await sb.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
    options: { data: { name: name.trim(), role: "member" } },
  });
  return { error: error?.message ?? null };
}
