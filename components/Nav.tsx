"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { springSnappy, springSoft, springBouncy, EASE_OUT } from "@/lib/motion";
import Logo from "./Logo";

type NavLink = { href: string; label: string; short: string; icon: ReactNode };

const ICON = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5" />,
  plan: <><path d="M4 6h16M4 12h16M4 18h10" /></>,
  check: <><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="m9 11 2 2 4-4" /></>,
  journal: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></>,
  members: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 6.5a3 3 0 0 1 0 5.5M17.5 19a5.5 5.5 0 0 0-2.5-4.6" /></>,
};

const BASE_LINKS: NavLink[] = [
  { href: "/", label: "Accueil", short: "Accueil", icon: ICON.home },
  { href: "/plan", label: "Mon plan", short: "Plan", icon: ICON.plan },
  { href: "/trade", label: "Check pré-trade", short: "Check", icon: ICON.check },
  { href: "/journal", label: "Journal", short: "Journal", icon: ICON.journal },
];

const MENTOR_LINK: NavLink = { href: "/membres", label: "Membres", short: "Membres", icon: ICON.members };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      {children}
    </svg>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const { session, user, isMentor, signOut } = useAuth();
  const LINKS = isMentor ? [...BASE_LINKS, MENTOR_LINK] : BASE_LINKS;

  return (
    <>
      {/* Top header */}
      <motion.header
        className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" className="group flex items-baseline gap-2">
            <motion.span
              className="inline-flex"
              whileHover={{ scale: 1.04, rotate: -1.5 }}
              whileTap={{ scale: 0.97 }}
              transition={springSnappy}
            >
              <Logo className="chrome-text text-xl" />
            </motion.span>
            <motion.span
              className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-muted sm:inline"
              animate={{ opacity: 1 }}
              whileHover={{ opacity: 1 }}
            >
              {isMentor ? "mentor" : "membre"}
            </motion.span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Desktop nav with animated pill */}
            <nav className="hidden items-center gap-0.5 sm:flex">
              {LINKS.map((l) => {
                const active = isActive(pathname, l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="group relative px-3 py-1.5 text-sm"
                  >
                    {active ? (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-lg bg-surface-2 shadow-[0_0_0_1px_rgba(79,131,255,0.18),0_6px_18px_-6px_rgba(79,131,255,0.45)]"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      >
                        <motion.span
                          className="absolute inset-0 rounded-lg bg-accent/10"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={springSoft}
                        />
                      </motion.span>
                    ) : (
                      <motion.span
                        className="absolute inset-0 rounded-lg bg-surface-2/0"
                        initial={false}
                        whileHover={{ backgroundColor: "rgba(22,33,63,0.55)" }}
                        transition={{ duration: 0.2, ease: EASE_OUT }}
                      />
                    )}
                    <motion.span
                      className={`relative inline-block transition-colors ${active ? "text-foreground" : "text-muted group-hover:text-foreground"}`}
                      whileHover={{ y: -1 }}
                      whileTap={{ y: 0, scale: 0.96 }}
                      transition={springSnappy}
                    >
                      {l.label}
                    </motion.span>
                  </Link>
                );
              })}
            </nav>

            {session && (
              <div className="flex items-center gap-2 border-l border-border pl-2">
                <span className="hidden max-w-[150px] truncate text-xs text-muted md:inline">
                  {user?.email}
                </span>
                <motion.button
                  onClick={signOut}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-foreground"
                  initial={false}
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95, y: 0 }}
                  transition={springSnappy}
                >
                  Déconnexion
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur sm:hidden">
        <div className="relative flex items-stretch pb-[env(safe-area-inset-bottom)]">
          {LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className="relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]"
              >
                {active && (
                  <>
                    <motion.span
                      layoutId="mobile-nav-indicator"
                      className="absolute top-0 h-0.5 w-8 rounded-full bg-accent shadow-[0_0_10px_2px_rgba(79,131,255,0.7)]"
                      transition={{ type: "spring", stiffness: 420, damping: 30 }}
                    />
                    <motion.span
                      layoutId="mobile-nav-glow"
                      className="pointer-events-none absolute top-1.5 h-9 w-9 rounded-full bg-accent/15 blur-md"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  </>
                )}
                <motion.span
                  className={`relative ${active ? "text-accent" : "text-muted"}`}
                  animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }}
                  whileTap={{ scale: 0.86 }}
                  transition={active ? springBouncy : springSnappy}
                >
                  <Icon>{l.icon}</Icon>
                </motion.span>
                <motion.span
                  className={active ? "text-accent" : "text-muted"}
                  animate={{ opacity: active ? 1 : 0.85 }}
                  transition={springSnappy}
                >
                  {l.short}
                </motion.span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
