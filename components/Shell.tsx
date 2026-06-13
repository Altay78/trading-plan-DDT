"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
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

export default function Shell({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
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
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <motion.div
          className="h-8 w-8 rounded-full border-2 border-accent/30 border-t-accent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (mustRedirect) return null;

  return (
    <>
      <CursorSpotlight />
      <Nav />
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          className="mx-auto max-w-5xl px-4 pt-6 pb-28 sm:py-8"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </>
  );
}
