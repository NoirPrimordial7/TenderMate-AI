"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  CreditCard,
  FileSearch,
  History,
  LayoutDashboard,
  LogIn,
  LogOut,
  ReceiptText,
  Upload,
  UserCircle,
  UserPlus
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function titleCase(value?: string | null) {
  if (!value) return "Free";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || "Account").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function Header() {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const hasUsageFields = typeof user?.free_analysis_credits === "number";
  const freeCredits = Math.max(0, user?.free_analysis_credits ?? 0);
  const hasActiveSubscription = user?.subscription_status?.toLowerCase() === "active";
  const displayCredits = hasUsageFields ? freeCredits : 5;
  const planName = titleCase(user?.plan_name);
  const usageLabel = hasUsageFields && !hasActiveSubscription && freeCredits === 0
    ? `${planName} plan · Upgrade required`
    : `${planName} plan · ${displayCredits} credits left`;
  const initials = getInitials(user?.full_name, user?.email);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="TenderMate AI home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-950 text-white shadow-sm">
            <FileSearch className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="hidden text-lg font-semibold tracking-tight text-gray-950 sm:inline">TenderMate AI</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1" aria-label="Primary navigation">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Upload</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link
            href="/history"
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            <History className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">History</span>
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Pricing</span>
          </Link>
          {!isLoading && isAuthenticated ? (
            <>
              <Link
                href="/billing"
                className={`ml-2 hidden h-9 items-center rounded-md border px-3 text-xs font-semibold lg:inline-flex ${
                  hasUsageFields && !hasActiveSubscription && freeCredits === 0
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                {usageLabel}
              </Link>
              <div className="relative ml-1">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((current) => !current)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
                  aria-expanded={isProfileOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-950 text-xs font-semibold text-white">
                    {initials}
                  </span>
                  <span className="hidden max-w-28 truncate md:inline">{user?.full_name || "Account"}</span>
                  <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
                </button>

                {isProfileOpen ? (
                  <div
                    className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white p-2 text-left shadow-lg ring-1 ring-black/5"
                    role="menu"
                  >
                    <div className="rounded-lg bg-gray-50 px-3 py-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-950 text-sm font-semibold text-white">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-950">{user?.full_name ?? "Account"}</p>
                          <p className="truncate text-xs text-gray-500">{user?.email}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md border border-gray-200 bg-white px-2.5 py-2">
                          <p className="text-gray-500">Current plan</p>
                          <p className="mt-1 font-semibold text-gray-950">{planName}</p>
                        </div>
                        <div className="rounded-md border border-gray-200 bg-white px-2.5 py-2">
                          <p className="text-gray-500">Credits left</p>
                          <p className="mt-1 font-semibold text-gray-950">{displayCredits}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 grid gap-1">
                      <Link
                        href="/profile"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        role="menuitem"
                      >
                        <UserCircle className="h-4 w-4 text-gray-500" aria-hidden="true" />
                        Profile
                      </Link>
                      <Link
                        href="/billing"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        role="menuitem"
                      >
                        <ReceiptText className="h-4 w-4 text-gray-500" aria-hidden="true" />
                        Billing & usage
                      </Link>
                      <Link
                        href="/pricing"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        role="menuitem"
                      >
                        <CreditCard className="h-4 w-4 text-gray-500" aria-hidden="true" />
                        Pricing
                      </Link>
                      <Link
                        href="/dashboard"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        role="menuitem"
                      >
                        <LayoutDashboard className="h-4 w-4 text-gray-500" aria-hidden="true" />
                        Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          logout("/login");
                        }}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4 text-gray-500" aria-hidden="true" />
                        Logout
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
          {!isLoading && !isAuthenticated ? (
            <>
              <Link
                href="/login"
                className="ml-2 inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Login</span>
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-gray-950 px-3 text-sm font-semibold text-white hover:bg-black"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign up</span>
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
