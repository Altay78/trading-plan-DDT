"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { createMemberAccount } from "@/lib/members-client";
import { Field, Section, Badge } from "@/components/ui";

type ProfileRow = { id: string; email: string; name: string; role: "mentor" | "member" };

export default function MembresPage() {
  const { isMentor, loading } = useAuth();
  const [members, setMembers] = useState<ProfileRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setFetching(false);
      return;
    }
    setFetching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, email, name, role")
      .order("created_at", { ascending: true });
    setMembers((data as ProfileRow[]) ?? []);
    setFetching(false);
  }, []);

  useEffect(() => {
    if (!loading && isMentor) refresh();
    else if (!loading) setFetching(false);
  }, [loading, isMentor, refresh]);

  const addMember = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreated(null);
    const { error } = await createMemberAccount(email, password, name);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    setCreated({ email: email.toLowerCase().trim(), password });
    setName("");
    setEmail("");
    setPassword("");
    // Le profil est créé par le trigger côté Supabase ; petit délai puis refresh.
    setTimeout(refresh, 700);
  };

  if (loading) return <p className="text-sm text-muted">Chargement…</p>;

  if (!isMentor) {
    return (
      <div className="card grid place-items-center gap-2 p-10 text-center">
        <div className="text-2xl">🔒</div>
        <div className="text-sm font-medium">Réservé au mentor</div>
        <p className="max-w-sm text-sm text-muted">
          Cette page permet de gérer les comptes des membres. Seul un compte mentor y a accès.
        </p>
        <Link href="/" className="mt-2 text-sm text-accent hover:underline">← Retour à l&apos;accueil</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-stagger">
      <div>
        <h1 className="text-xl font-semibold">Membres</h1>
        <p className="mt-1 text-sm text-muted">
          Crée un compte pour chaque membre. Tu lui communiques son email et son mot de passe —
          il se connecte ensuite depuis n&apos;importe quel appareil.
        </p>
      </div>

      <Section title="Ajouter un membre" description="Choisis un mot de passe provisoire — le membre pourra le changer plus tard.">
        <form onSubmit={addMember} className="grid gap-4 sm:grid-cols-3">
          <Field label="Prénom / pseudo">
            <input className="input" required placeholder="Ex. Julie" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <input type="email" className="input" required placeholder="membre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Mot de passe" hint="Min. 8 caractères">
            <input type="text" className="input" required minLength={8} placeholder="provisoire123" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="sm:col-span-3">
            {error && <p className="mb-3 text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Création…" : "Créer le compte membre"}
            </button>
          </div>
        </form>

        <AnimatePresence>
          {created && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm"
            >
              <div className="font-semibold text-accent">Compte créé ✓</div>
              <p className="mt-1 text-muted">Transmets ces identifiants au membre :</p>
              <div className="mt-2 grid gap-1 font-mono text-xs">
                <div>email : <b className="text-foreground">{created.email}</b></div>
                <div>mot de passe : <b className="text-foreground">{created.password}</b></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      <Section title={`Membres (${members.length})`}>
        {fetching ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted">Aucun membre pour l&apos;instant.</p>
        ) : (
          <>
            <div className="divide-y divide-border">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold">
                    {(m.name || m.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{m.name || "—"}</div>
                    <div className="truncate text-xs text-muted">{m.email}</div>
                  </div>
                  <Badge tone={m.role === "mentor" ? "ok" : "muted"}>{m.role === "mentor" ? "Mentor" : "Membre"}</Badge>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">
              Pour retirer définitivement un membre, supprime-le dans Supabase →{" "}
              <span className="text-foreground">Authentication → Users</span>.
            </p>
          </>
        )}
      </Section>
    </div>
  );
}
