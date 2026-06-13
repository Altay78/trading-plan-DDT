"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/Logo";

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
    <div className="relative flex min-h-[100dvh] items-center justify-center px-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="card p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo className="chrome-text text-5xl" />
            <p className="mt-2 text-xs font-medium uppercase tracking-widest text-muted">
              Premier compte
            </p>
          </div>

          {done ? (
            <div className="space-y-3 text-center">
              <div className="text-3xl">✓</div>
              <p className="text-sm font-semibold">Compte créé !</p>
              <p className="text-sm text-muted">Connexion en cours…</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h1 className="text-lg font-semibold">Créer ton compte</h1>
                <p className="mt-1 text-sm text-muted">
                  Le premier compte créé devient automatiquement <b>mentor</b> — tu pourras
                  ensuite ajouter tes membres.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Prénom / pseudo</label>
                <input className="input" required placeholder="Altay" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Email</label>
                <input type="email" className="input" required placeholder="ton@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Mot de passe (min. 8 car.)</label>
                <input type="password" className="input" required minLength={8} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <motion.button
                type="submit"
                disabled={loading}
                className="btn-primary w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
                whileTap={{ scale: 0.97 }}
              >
                {loading ? "Création…" : "Créer le compte"}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
