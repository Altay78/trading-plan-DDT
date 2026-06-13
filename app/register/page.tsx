"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/Logo";

const orbs = [
  { w: 560, h: 560, x: "72%", y: "-18%", color: "rgba(79,131,255,0.18)", dur: 12, delay: 0 },
  { w: 420, h: 420, x: "-8%", y: "60%", color: "rgba(99,91,255,0.14)", dur: 15, delay: 2 },
  { w: 320, h: 320, x: "55%", y: "70%", color: "rgba(79,131,255,0.10)", dur: 10, delay: 4 },
  { w: 250, h: 250, x: "20%", y: "10%", color: "rgba(130,80,255,0.10)", dur: 18, delay: 1 },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function RegisterPage() {
  const { session, signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;
    setLoading(true);
    setError(null);
    const { error } = await signUp(email.trim(), password, name.trim());
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSuccess(true);
      setTimeout(() => router.replace("/"), 1200);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute rounded-full blur-3xl"
          style={{ width: o.w, height: o.h, left: o.x, top: o.y, background: o.color }}
          animate={{ x: [0, 24, -18, 8, 0], y: [0, -32, 16, -8, 0], scale: [1, 1.12, 0.94, 1.06, 1] }}
          transition={{ duration: o.dur, repeat: Infinity, ease: "easeInOut", delay: o.delay }}
        />
      ))}

      <motion.div
        className="card-glow relative z-10 w-full max-w-sm overflow-hidden rounded-2xl p-8"
        initial={{ opacity: 0, y: 48, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-2xl"
          style={{ zIndex: -1 }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 rounded-2xl" style={{
            background: "conic-gradient(from 200deg, transparent 40%, rgba(79,131,255,0.6) 55%, transparent 70%)",
          }} />
        </motion.div>

        <motion.div
          className="mb-8 flex flex-col items-center text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative mb-1">
            <motion.div
              className="absolute inset-0 rounded-full blur-2xl"
              style={{ background: "rgba(79,131,255,0.3)", transform: "scale(1.4)" }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <Logo className="chrome-text relative text-6xl" />
          </div>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.28em] text-muted">
            Créer mon compte
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              className="flex flex-col items-center gap-3 py-4 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.div
                className="grid h-14 w-14 place-items-center rounded-full bg-accent/20 text-3xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                ✓
              </motion.div>
              <p className="font-semibold">Compte créé !</p>
              <p className="text-sm text-muted">Redirection…</p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={submit}
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45, duration: 0.5, ease: EASE }}>
                <label className="mb-1.5 block text-xs font-medium text-muted">Prénom / pseudo</label>
                <input
                  required
                  className="input"
                  placeholder="Ex. Julie"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55, duration: 0.5, ease: EASE }}>
                <label className="mb-1.5 block text-xs font-medium text-muted">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="input"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65, duration: 0.5, ease: EASE }}>
                <label className="mb-1.5 block text-xs font-medium text-muted">Mot de passe (min. 8 car.)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.75, duration: 0.5, ease: EASE }}>
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        className="block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                      Création…
                    </span>
                  ) : (
                    "Créer mon compte"
                  )}
                </motion.button>
              </motion.div>

              <motion.p
                className="text-center text-xs text-muted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.85 }}
              >
                Déjà un compte ?{" "}
                <Link href="/login" className="text-accent hover:underline">
                  Se connecter
                </Link>
              </motion.p>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
