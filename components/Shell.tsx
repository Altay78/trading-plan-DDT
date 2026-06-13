"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { EASE_OUT, EASE_SOFT, springSoft } from "@/lib/motion";
import Logo from "./Logo";
import Nav from "./Nav";

function CursorSpotlight() {
  useEffect(() => {
    const update = (e: MouseEvent) => {
      document.body.style.setProperty("--cx", `${e.clientX}px`);
      document.body.style.setProperty("--cy", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", update, { passive: true });
    return () => window.removeEventListener("mousemove", update);
  }, []);
  return null;
}

/* ------------------------------------------------------------------
 * Branded loading state.
 * A breathing DDT logo over a soft drifting aurora glow, ringed by a
 * pulsing accent halo, with a thin indeterminate progress sweep beneath.
 * Pure transform/opacity. CSS keyframes (.aurora-orb / .pulse-ring /
 * .chrome-text) are neutralized under prefers-reduced-motion in globals.css;
 * the framer-driven breathing + bar are gated via useReducedMotion below.
 * ------------------------------------------------------------------ */
function BrandedLoader() {
  const reduce = useReducedMotion();

  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <motion.div
        className="relative flex flex-col items-center gap-6"
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE_SOFT }}
      >
        {/* Soft blue aurora behind the mark (drifts via CSS; static if reduced) */}
        <span
          aria-hidden
          className="aurora-orb pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60"
        />

        {/* Logo + pulsing accent halo */}
        <div className="relative grid place-items-center">
          <span
            aria-hidden
            className="pulse-ring absolute inset-0 m-auto h-16 w-16 rounded-full"
          />
          <motion.div
            className="relative"
            animate={
              reduce
                ? undefined
                : { scale: [1, 1.06, 1], opacity: [0.82, 1, 0.82] }
            }
            transition={
              reduce
                ? undefined
                : { duration: 1.8, ease: EASE_SOFT, repeat: Infinity }
            }
          >
            <Logo className="text-4xl" />
          </motion.div>
        </div>

        {/* Indeterminate progress sweep */}
        <div className="relative h-[3px] w-40 overflow-hidden rounded-full bg-surface-2">
          {!reduce && (
            <motion.span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-accent"
              style={{ filter: "drop-shadow(0 0 6px rgba(79,131,255,0.6))" }}
              initial={{ x: "-110%" }}
              animate={{ x: "220%" }}
              transition={{
                duration: 1.15,
                ease: EASE_OUT,
                repeat: Infinity,
                repeatDelay: 0.15,
              }}
            />
          )}
        </div>

        <span className="sr-only" role="status" aria-live="polite">
          Chargement…
        </span>
      </motion.div>
    </div>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const isLogin = pathname === "/login" || pathname === "/setup";

  const mustRedirect = !loading && !session && !isLogin;

  useEffect(() => {
    if (mustRedirect) router.replace("/login");
  }, [mustRedirect, router]);

  if (isLogin) {
    return (
      <>
        <CursorSpotlight />
        <main className="min-h-[100dvh]">{children}</main>
      </>
    );
  }

  if (loading) {
    return <BrandedLoader />;
  }

  if (mustRedirect) return null;

  // Page transition — richer entrance/exit (blur + slide + scale) that stays
  // fast (~0.32s). Reduced motion collapses to a plain opacity crossfade with
  // no transform or blur, so critical info reads instantly.
  const enter = reduce
    ? { opacity: 1 }
    : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" };
  const initial = reduce
    ? { opacity: 0 }
    : { opacity: 0, y: 16, scale: 0.985, filter: "blur(8px)" };
  const exit = reduce
    ? { opacity: 0 }
    : { opacity: 0, y: -12, scale: 0.99, filter: "blur(6px)" };

  return (
    <>
      <CursorSpotlight />
      <Nav />
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          className="mx-auto max-w-5xl px-4 pt-6 pb-28 sm:py-8"
          initial={initial}
          animate={enter}
          exit={exit}
          transition={
            reduce
              ? { duration: 0.2, ease: EASE_OUT }
              : {
                  duration: 0.34,
                  ease: EASE_OUT,
                  scale: springSoft,
                  filter: { duration: 0.34, ease: EASE_SOFT },
                }
          }
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </>
  );
}
