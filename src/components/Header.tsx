"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  CreditCard,
  FileSearch,
  History,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  ReceiptText,
  Upload,
  UserCircle,
  UserPlus,
  X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const primaryLinks = [
  { href: "/", label: "Upload", icon: Upload },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: History },
  { href: "/pricing", label: "Pricing", icon: CreditCard }
];

function titleCase(value?: string | null) {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || "Account").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname === "/upload";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const firstProfileItemRef = useRef<HTMLAnchorElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);

  const credits = typeof user?.free_analysis_credits === "number"
    ? Math.max(0, user.free_analysis_credits)
    : null;
  const planName = titleCase(user?.plan_name);
  const hasActiveSubscription = user?.subscription_status?.toLowerCase() === "active";
  const usageLabel = credits === null
    ? "Usage unavailable"
    : !hasActiveSubscription && credits === 0
      ? "Upgrade required"
      : `${credits} ${credits === 1 ? "credit" : "credits"}`;
  const initials = getInitials(user?.full_name, user?.email);

  useEffect(() => {
    setIsProfileOpen(false);
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isProfileOpen && !profileMenuRef.current?.contains(target) && !profileButtonRef.current?.contains(target)) {
        setIsProfileOpen(false);
      }
      if (isMobileOpen && !mobileMenuRef.current?.contains(target) && !mobileButtonRef.current?.contains(target)) {
        setIsMobileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isProfileOpen) {
          setIsProfileOpen(false);
          profileButtonRef.current?.focus();
        } else if (isMobileOpen) {
          setIsMobileOpen(false);
          mobileButtonRef.current?.focus();
        }
        return;
      }

      if (event.key === "Tab" && isMobileOpen && mobileMenuRef.current) {
        const focusable = Array.from(
          mobileMenuRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileOpen, isProfileOpen]);

  useEffect(() => {
    if (isProfileOpen) window.requestAnimationFrame(() => firstProfileItemRef.current?.focus());
  }, [isProfileOpen]);

  useEffect(() => {
    if (!isMobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => firstMobileLinkRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileOpen]);

  const closeMobile = () => setIsMobileOpen(false);
  const closeProfile = () => setIsProfileOpen(false);
  const menuTransition = { duration: shouldReduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <motion.header
      className="te-header"
      initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="te-header-inner">
        <Link href="/" className="te-brand" aria-label="TenderMate AI home">
          <span className="te-brand-mark"><FileSearch className="h-5 w-5" aria-hidden="true" /></span>
          <span className="te-brand-word"><strong>TENDER</strong><b>MATE</b><small>AI</small></span>
        </Link>

        <nav className="te-desktop-nav" aria-label="Primary navigation">
          {primaryLinks.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "te-nav-active" : ""} aria-current={active ? "page" : undefined}>
                <span>{item.label}</span><i aria-hidden="true" />
              </Link>
            );
          })}
        </nav>

        <div className="te-header-actions">
          {!isLoading && isAuthenticated && user ? (
            <div className="te-desktop-account">
              <Link href="/billing" className={`te-plan-control ${credits === 0 && !hasActiveSubscription ? "te-plan-warning" : ""}`}>
                <span>{planName ? `${planName} plan` : "Plan unavailable"}</span>
                <strong>{usageLabel}</strong>
              </Link>
              <div className="relative">
                <button
                  ref={profileButtonRef}
                  type="button"
                  onClick={() => {
                    setIsMobileOpen(false);
                    setIsProfileOpen((current) => !current);
                  }}
                  className="te-account-button"
                  aria-expanded={isProfileOpen}
                  aria-haspopup="menu"
                  aria-controls="profile-menu"
                >
                  <span className="te-avatar">{initials}</span>
                  <span className="te-account-name">{user.full_name || "Account"}</span>
                  <ChevronDown className={`h-4 w-4 ${isProfileOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                <AnimatePresence>
                  {isProfileOpen ? (
                    <motion.div
                      ref={profileMenuRef}
                      id="profile-menu"
                      className="te-profile-menu"
                      role="menu"
                      aria-label="Account menu"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: -8, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.99 }}
                      transition={menuTransition}
                    >
                      <div className="te-profile-summary">
                        <span className="te-avatar te-avatar-large">{initials}</span>
                        <div><p>{user.full_name || "Account"}</p><span>{user.email}</span></div>
                      </div>
                      <dl className="te-profile-usage">
                        <div><dt>Plan</dt><dd>{planName ?? "Unavailable"}</dd></div>
                        <div><dt>Credits</dt><dd>{credits ?? "Unavailable"}</dd></div>
                      </dl>
                      <div className="te-profile-links">
                        <Link ref={firstProfileItemRef} href="/profile" onClick={closeProfile} role="menuitem"><UserCircle className="h-4 w-4" /> Profile</Link>
                        <Link href="/billing" onClick={closeProfile} role="menuitem"><ReceiptText className="h-4 w-4" /> Billing & usage</Link>
                        <Link href="/dashboard" onClick={closeProfile} role="menuitem"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
                        <button type="button" onClick={() => { closeProfile(); logout("/login"); }} role="menuitem"><LogOut className="h-4 w-4" /> Sign out</button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          ) : null}

          {!isLoading && !isAuthenticated ? (
            <div className="te-desktop-auth">
              <Link href="/login">Sign in</Link>
              <Link href="/signup">Create account <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          ) : null}

          <button
            ref={mobileButtonRef}
            type="button"
            className="te-mobile-trigger"
            onClick={() => {
              setIsProfileOpen(false);
              setIsMobileOpen((current) => !current);
            }}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-navigation"
            aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {isMobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileOpen ? (
          <motion.div
            className="te-mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={menuTransition}
          >
            <motion.div
              ref={mobileMenuRef}
              id="mobile-navigation"
              className="te-mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={shouldReduceMotion ? false : { opacity: 0, y: -14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={menuTransition}
            >
              <div className="te-mobile-menu-head"><span>Navigation</span><span>TM.OS / 01</span></div>
              <nav aria-label="Mobile navigation" className="te-mobile-links">
                {primaryLinks.map((item, index) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      ref={index === 0 ? firstMobileLinkRef : undefined}
                      href={item.href}
                      onClick={closeMobile}
                      className={active ? "te-mobile-link-active" : ""}
                      aria-current={active ? "page" : undefined}
                    >
                      <span><Icon className="h-4 w-4" aria-hidden="true" /> {item.label}</span>
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  );
                })}
              </nav>

              {!isLoading && isAuthenticated && user ? (
                <div className="te-mobile-account">
                  <div className="te-profile-summary"><span className="te-avatar te-avatar-large">{initials}</span><div><p>{user.full_name || "Account"}</p><span>{user.email}</span></div></div>
                  <p>{planName ? `${planName} plan` : "Plan unavailable"} · {usageLabel}</p>
                  <div><Link href="/profile" onClick={closeMobile}>Profile</Link><Link href="/billing" onClick={closeMobile}>Billing</Link></div>
                  <button type="button" onClick={() => { closeMobile(); logout("/login"); }}><LogOut className="h-4 w-4" /> Sign out</button>
                </div>
              ) : null}

              {!isLoading && !isAuthenticated ? (
                <div className="te-mobile-auth">
                  <Link href="/login" onClick={closeMobile}><LogIn className="h-4 w-4" /> Sign in</Link>
                  <Link href="/signup" onClick={closeMobile}><UserPlus className="h-4 w-4" /> Create account</Link>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
