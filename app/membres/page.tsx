"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { createMemberAccount } from "@/lib/members-client";
import { Field, Section, Badge } from "@/components/ui";
import { Reveal, MagneticButton, Shine } from "@/components/motion";
import {
  EASE_OUT,
  springSoft,
  springSnappy,
  springBouncy,
  staggerItem,
} from "@/lib/motion";

type ProfileRow = { id: string; email: string; name: string; role: "mentor" | "member" };

export default function MembresPage() {
  const { isMentor, loading } = useAuth();
  const reduce = useReducedMotion();
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
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={springSoft}
        className="card grid place-items-center gap-2 p-10 text-center"
      >
        <motion.div
          initial={reduce ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...springBouncy, delay: 0.08 }}
          className="text-2xl"
        >
          🔒
        </motion.div>
        <div className="text-sm font-medium">Réservé au mentor</div>
        <p className="max-w-sm text-sm text-muted">
          Cette page permet de gérer les comptes des membres. Seul un compte mentor y a accès.
        </p>
        <Link href="/" className="mt-2 text-sm text-accent hover:underline">← Retour à l&apos;accueil</Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <Reveal as="div" y={12}>
        <h1 className="text-xl font-semibold">Membres</h1>
        <p className="mt-1 text-sm text-muted">
          Crée un compte pour chaque membre. Tu lui communiques son email et son mot de passe —
          il se connecte ensuite depuis n&apos;importe quel appareil.
        </p>
      </Reveal>

      <Reveal as="div" delay={0.06} y={16}>
        <Section title="Ajouter un membre" description="Choisis un mot de passe provisoire — le membre pourra le changer plus tard.">
          <motion.form
            onSubmit={addMember}
            className="grid gap-4 sm:grid-cols-3"
            initial={reduce ? false : "hidden"}
            animate="visible"
            transition={{ staggerChildren: 0.07, delayChildren: 0.1 }}
            variants={{ hidden: {}, visible: {} }}
          >
            <motion.div variants={staggerItem}>
              <Field label="Prénom / pseudo">
                <input className="input" required placeholder="Ex. Julie" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </motion.div>
            <motion.div variants={staggerItem}>
              <Field label="Email">
                <input type="email" className="input" required placeholder="membre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </motion.div>
            <motion.div variants={staggerItem}>
              <Field label="Mot de passe" hint="Min. 8 caractères">
                <input type="text" className="input" required minLength={8} placeholder="provisoire123" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            </motion.div>
            <motion.div className="sm:col-span-3" variants={staggerItem}>
              <AnimatePresence initial={false}>
                {error && (
                  <motion.p
                    key="form-error"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, height: 0 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, height: "auto" }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.28, ease: EASE_OUT }}
                    className="mb-3 overflow-hidden text-sm text-danger"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              <MagneticButton
                type="submit"
                disabled={submitting}
                strength={5}
                className="btn-primary relative inline-flex items-center overflow-hidden rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                <span className="relative inline-flex items-center">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={submitting ? "loading" : "idle"}
                      initial={reduce ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                      transition={{ duration: 0.2, ease: EASE_OUT }}
                    >
                      {submitting ? "Création…" : "Créer le compte membre"}
                    </motion.span>
                  </AnimatePresence>
                </span>
                {created && !submitting && <Shine radius={12} />}
              </MagneticButton>
            </motion.div>
          </motion.form>

          <AnimatePresence>
            {created && (
              <motion.div
                key="created-card"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                transition={springSoft}
                className="relative mt-4 overflow-hidden rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm"
              >
                <Shine />
                <div className="flex items-center gap-2 font-semibold text-accent">
                  <motion.span
                    initial={reduce ? false : { scale: 0, rotate: -25 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ ...springBouncy, delay: 0.05 }}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/25 text-[11px] text-accent"
                    aria-hidden
                  >
                    ✓
                  </motion.span>
                  <span>Compte créé</span>
                </div>
                <motion.p
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.12 }}
                  className="mt-1 text-muted"
                >
                  Transmets ces identifiants au membre :
                </motion.p>
                <motion.div
                  className="mt-2 grid gap-1 font-mono text-xs"
                  initial={reduce ? false : "hidden"}
                  animate="visible"
                  transition={{ staggerChildren: 0.07, delayChildren: 0.18 }}
                  variants={{ hidden: {}, visible: {} }}
                >
                  <motion.div variants={staggerItem}>
                    email : <b className="text-foreground">{created.email}</b>
                  </motion.div>
                  <motion.div variants={staggerItem}>
                    mot de passe : <b className="text-foreground">{created.password}</b>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>
      </Reveal>

      <Reveal as="div" delay={0.12} y={16}>
        <Section title={`Membres (${members.length})`}>
          {fetching ? (
            <div className="space-y-3" aria-busy="true" aria-label="Chargement des membres">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <div className="skeleton h-9 w-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-32 rounded" />
                    <div className="skeleton h-3 w-44 rounded" />
                  </div>
                  <div className="skeleton h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="text-sm text-muted"
            >
              Aucun membre pour l&apos;instant.
            </motion.p>
          ) : (
            <>
              <motion.div
                className="divide-y divide-border"
                initial={reduce ? false : "hidden"}
                animate="visible"
                transition={{ staggerChildren: 0.05 }}
                variants={{ hidden: {}, visible: {} }}
              >
                <AnimatePresence initial={false}>
                  {members.map((m) => (
                    <motion.div
                      key={m.id}
                      layout={!reduce}
                      variants={staggerItem}
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16, height: 0 }}
                      transition={springSoft}
                      className="flex items-center gap-3 overflow-hidden py-3"
                    >
                      <motion.div
                        initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={springSnappy}
                        whileHover={reduce ? undefined : { scale: 1.08 }}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold"
                      >
                        {(m.name || m.email).charAt(0).toUpperCase()}
                      </motion.div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{m.name || "—"}</div>
                        <div className="truncate text-xs text-muted">{m.email}</div>
                      </div>
                      <Badge tone={m.role === "mentor" ? "ok" : "muted"}>{m.role === "mentor" ? "Mentor" : "Membre"}</Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
              <p className="mt-4 text-xs text-muted">
                Pour retirer définitivement un membre, supprime-le dans Supabase →{" "}
                <span className="text-foreground">Authentication → Users</span>.
              </p>
            </>
          )}
        </Section>
      </Reveal>
    </div>
  );
}
