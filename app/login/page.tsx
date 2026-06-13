"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/Logo";
import { GradientBorder, MagneticButton, Shine } from "@/components/motion";
import { EASE_OUT, EASE_SOFT, springSoft, springBouncy } from "@/lib/motion";

const orbs = [
  { w: 560, h: 560, x: "72%", y: "-18%", color: "rgba(79,131,255,0.18)", dur: 12, delay: 0 },
  { w: 420, h: 420, x: "-8%", y: "60%", color: "rgba(99,91,255,0.14)", dur: 15, delay: 2 },
  { w: 320, h: 320, x: "55%", y: "70%", color: "rgba(79,131,255,0.10)", dur: 10, delay: 4 },
  { w: 250, h: 250, x: "20%", y: "10%", color: "rgba(130,80,255,0.10)", dur: 18, delay: 1 },
];

const EASE = EASE_OUT;

// Per-field stagger that slides in from the active tab's direction.
const fieldsContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};

const makeFieldItem = (dir: number): Variants => ({
  hidden: { opacity: 0, x: dir * 22, filter: "blur(6px)" },
  visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: EASE_SOFT } },
  exit: { opacity: 0, x: dir * -18, filter: "blur(6px)", transition: { duration: 0.2, ease: EASE } },
});

export default function LoginPage() {
  const { session, signIn, signUp } = useAuth();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  const reset = () => { setError(null); setSuccess(false); };

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    reset();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = mode === "login"
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, name.trim());
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => router.replace(mode === "register" ? "/" : "/"), 800);
    }
  };

  // Direction the incoming form slides from: login from the left, register from the right.
  const dir = mode === "login" ? -1 : 1;
  const fieldItem = makeFieldItem(dir);

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute rounded-full blur-3xl"
          style={{ width: o.w, height: o.h, left: o.x, top: o.y, background: o.color }}
          animate={
            reduce
              ? undefined
              : {
                  x: [0, 24, -18, 8, 0],
                  y: [0, -32, 16, -8, 0],
                  scale: [1, 1.12, 0.94, 1.06, 1],
                  opacity: [0.7, 1, 0.55, 0.9, 0.7],
                }
          }
          transition={{ duration: o.dur, repeat: Infinity, ease: "easeInOut", delay: o.delay }}
        />
      ))}

      {/* Slow conic aurora wash behind the card for added depth */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute z-0 h-[140vmin] w-[140vmin] rounded-full opacity-[0.45] blur-[120px]"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(79,131,255,0.16), rgba(130,80,255,0.10), rgba(79,131,255,0.02), rgba(79,131,255,0.16))",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
      )}

      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={reduce ? false : { opacity: 0, y: 48, scale: 0.94, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <GradientBorder
          radius={20}
          thickness={1}
          durationSec={9}
          innerClassName="card-glow relative overflow-hidden rounded-[19px] bg-surface p-8"
        >
          {/* One-shot light sweep across the card on mount */}
          <Shine delaySec={0.5} durationSec={1.4} radius={19} />

          {/* Logo */}
          <motion.div
            className="mb-7 flex flex-col items-center text-center"
            initial={reduce ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
          >
            <motion.div
              className="relative mb-1"
              animate={reduce ? undefined : { y: [0, -5, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Breathing aura */}
              <motion.div
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ background: "rgba(79,131,255,0.32)", transform: "scale(1.4)" }}
                animate={reduce ? undefined : { opacity: [0.45, 1, 0.45], scale: [1.3, 1.55, 1.3] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Slow rotating accent ring */}
              {!reduce && (
                <motion.div
                  aria-hidden
                  className="absolute -inset-4 rounded-full opacity-60"
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent 55%, rgba(79,131,255,0.45) 75%, transparent 90%)",
                    maskImage: "radial-gradient(circle, transparent 58%, #000 62%, #000 70%, transparent 73%)",
                    WebkitMaskImage:
                      "radial-gradient(circle, transparent 58%, #000 62%, #000 70%, transparent 73%)",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                />
              )}
              <Logo className="chrome-text relative text-6xl" />
            </motion.div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.28em] text-muted">
              Plan &amp; discipline
            </p>
          </motion.div>

          {/* Toggle login / register */}
          <div className="mb-6 flex rounded-xl bg-surface-2 p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="relative flex-1 rounded-lg py-2 text-sm font-semibold transition"
              >
                {mode === m && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 rounded-lg bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  >
                    <span className="absolute inset-0 rounded-lg shadow-[0_4px_16px_-4px_rgba(79,131,255,0.7)]" />
                  </motion.div>
                )}
                <span className={`relative z-10 ${mode === m ? "text-white" : "text-muted"}`}>
                  {m === "login" ? "Se connecter" : "S'inscrire"}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                className="flex flex-col items-center gap-3 py-4 text-center"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={reduce ? { duration: 0.2 } : springSoft}
              >
                <motion.div
                  className="relative grid h-16 w-16 place-items-center rounded-full bg-accent/15"
                  initial={reduce ? false : { scale: 0.6 }}
                  animate={{ scale: 1 }}
                  transition={reduce ? { duration: 0 } : springBouncy}
                >
                  {/* Expanding halo */}
                  {!reduce && (
                    <motion.span
                      className="absolute inset-0 rounded-full border border-accent/50"
                      initial={{ scale: 0.8, opacity: 0.8 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{ duration: 0.9, ease: EASE_OUT }}
                    />
                  )}
                  {/* Drawn checkmark */}
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden>
                    <motion.path
                      d="M4.5 12.5l5 5 10-11"
                      stroke="var(--accent)"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { pathLength: { delay: 0.12, duration: 0.45, ease: EASE_OUT }, opacity: { delay: 0.12, duration: 0.1 } }
                      }
                    />
                  </svg>
                </motion.div>
                <motion.p
                  className="text-sm text-muted"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3, ease: EASE_OUT }}
                >
                  {mode === "login" ? "Connexion réussie…" : "Compte créé !"}
                </motion.p>
              </motion.div>
            ) : (
              <motion.form
                key={mode}
                onSubmit={submit}
                className="space-y-4"
                variants={reduce ? undefined : fieldsContainer}
                initial={reduce ? false : "hidden"}
                animate="visible"
                exit={reduce ? undefined : "exit"}
              >
                {mode === "register" && (
                  <motion.div variants={reduce ? undefined : fieldItem}>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Prénom / pseudo</label>
                    <input
                      required
                      className="input"
                      placeholder="Ex. Julie"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </motion.div>
                )}

                <motion.div variants={reduce ? undefined : fieldItem}>
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

                <motion.div variants={reduce ? undefined : fieldItem}>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Mot de passe{mode === "register" ? " (min. 8 car.)" : ""}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={mode === "register" ? 8 : 1}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
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
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, x: [0, -5, 4, -3, 0] }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={reduce ? { duration: 0.2 } : { y: { duration: 0.25 }, x: { duration: 0.4, ease: EASE_OUT } }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.div variants={reduce ? undefined : fieldItem}>
                  <MagneticButton
                    type="submit"
                    disabled={loading}
                    strength={8}
                    className="btn-primary relative w-full overflow-hidden rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {!loading && <Shine loop durationSec={2.4} delaySec={1.2} radius={12} />}
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span
                          className="block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        />
                        {mode === "login" ? "Connexion…" : "Création…"}
                      </span>
                    ) : (
                      mode === "login" ? "Se connecter" : "Créer mon compte"
                    )}
                  </MagneticButton>
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>
        </GradientBorder>
      </motion.div>
    </div>
  );
}
