"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/Logo";
import { Stagger, StaggerChild, Shine } from "@/components/motion";
import { EASE_OUT, springBouncy, springSnappy } from "@/lib/motion";

const orbs = [
  { w: 560, h: 560, x: "70%", y: "-20%", color: "rgba(79,131,255,0.18)", dur: 12, delay: 0 },
  { w: 420, h: 420, x: "-10%", y: "58%", color: "rgba(99,91,255,0.14)", dur: 15, delay: 2 },
  { w: 320, h: 320, x: "55%", y: "72%", color: "rgba(79,131,255,0.10)", dur: 10, delay: 4 },
  { w: 250, h: 250, x: "18%", y: "8%", color: "rgba(130,80,255,0.10)", dur: 18, delay: 1 },
];

export default function SetupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signUp(email, password, name);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setDone(true);
      setTimeout(() => router.replace("/"), 1500);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4">
      {/* Drifting aurora orbs (matches login) */}
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
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
      >
        <div className="card relative overflow-hidden p-8">
          {/* One-shot light sweep across the card on mount */}
          <Shine delaySec={0.45} durationSec={1.2} radius={16} />

          {/* Breathing conic accent ring */}
          <motion.div
            className="pointer-events-none absolute -inset-px rounded-2xl"
            style={{ zIndex: 0 }}
            animate={{ opacity: [0.35, 0.85, 0.35] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  "conic-gradient(from 200deg, transparent 40%, rgba(79,131,255,0.55) 55%, transparent 70%)",
              }}
            />
          </motion.div>

          <div className="relative z-10">
            <motion.div
              className="mb-6 flex flex-col items-center text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.6, ease: EASE_OUT }}
            >
              <div className="relative mb-1">
                {/* Pulsing glow behind the logo */}
                <motion.div
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{ background: "rgba(79,131,255,0.3)", transform: "scale(1.4)" }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <Logo className="chrome-text relative text-5xl" />
              </div>
              <motion.p
                className="mt-2 text-xs font-medium uppercase tracking-widest text-muted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.32, duration: 0.5, ease: EASE_OUT }}
              >
                Premier compte
              </motion.p>
            </motion.div>

            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key="done"
                  className="flex flex-col items-center gap-3 py-4 text-center"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={springBouncy}
                >
                  <motion.div
                    className="relative grid h-16 w-16 place-items-center rounded-full bg-accent/20 text-3xl text-accent"
                    initial={{ scale: 0, rotate: -25 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ ...springBouncy, delay: 0.05 }}
                  >
                    {/* Expanding celebratory halo */}
                    <motion.span
                      className="absolute inset-0 rounded-full border border-accent/50"
                      initial={{ opacity: 0.7, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.9 }}
                      transition={{ duration: 1, ease: EASE_OUT, repeat: Infinity, repeatDelay: 0.3 }}
                    />
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.25, 1] }}
                      transition={{ ...springBouncy, delay: 0.18 }}
                    >
                      ✓
                    </motion.span>
                  </motion.div>
                  <motion.p
                    className="text-sm font-semibold"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28, duration: 0.4, ease: EASE_OUT }}
                  >
                    Compte créé !
                  </motion.p>
                  <motion.p
                    className="flex items-center gap-2 text-sm text-muted"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.38, duration: 0.4, ease: EASE_OUT }}
                  >
                    <motion.span
                      className="block h-3.5 w-3.5 rounded-full border-2 border-muted/30 border-t-accent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    Connexion en cours…
                  </motion.p>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25, ease: EASE_OUT }}
                >
                  <form onSubmit={submit}>
                    <Stagger className="space-y-4" stagger={0.07} delayChildren={0.28}>
                      <StaggerChild>
                        <h1 className="text-lg font-semibold">Créer ton compte</h1>
                        <p className="mt-1 text-sm text-muted">
                          Le premier compte créé devient automatiquement <b>mentor</b> — tu pourras
                          ensuite ajouter tes membres.
                        </p>
                      </StaggerChild>
                      <StaggerChild>
                        <label className="mb-1.5 block text-xs font-medium text-muted">Prénom / pseudo</label>
                        <input className="input" required placeholder="Altay" value={name} onChange={(e) => setName(e.target.value)} />
                      </StaggerChild>
                      <StaggerChild>
                        <label className="mb-1.5 block text-xs font-medium text-muted">Email</label>
                        <input type="email" className="input" required placeholder="ton@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </StaggerChild>
                      <StaggerChild>
                        <label className="mb-1.5 block text-xs font-medium text-muted">Mot de passe (min. 8 car.)</label>
                        <input type="password" className="input" required minLength={8} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                      </StaggerChild>
                      <StaggerChild>
                        <AnimatePresence>
                          {error && (
                            <motion.p
                              className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
                              initial={{ opacity: 0, y: -6, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: "auto" }}
                              exit={{ opacity: 0, y: -6, height: 0 }}
                              transition={{ duration: 0.25, ease: EASE_OUT }}
                            >
                              {error}
                            </motion.p>
                          )}
                        </AnimatePresence>
                        <motion.button
                          type="submit"
                          disabled={loading}
                          className="btn-primary relative w-full overflow-hidden rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
                          whileHover={loading ? undefined : { scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          transition={springSnappy}
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
                            "Créer le compte"
                          )}
                        </motion.button>
                      </StaggerChild>
                    </Stagger>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
