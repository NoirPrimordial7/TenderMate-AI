"use client";

import Link from "next/link";
import { FileSearch, History, LayoutDashboard, LogIn, LogOut, Upload, UserCircle, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
  const { isAuthenticated, isLoading, logout, user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="TenderMate AI home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-950 text-white">
            <FileSearch className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-gray-950">TenderMate AI</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Primary navigation">
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
          {!isLoading && isAuthenticated ? (
            <>
              <div className="ml-2 hidden max-w-52 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-left md:flex">
                <UserCircle className="h-4 w-4 flex-none text-gray-600" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-gray-950">{user?.full_name ?? "Account"}</p>
                  <p className="truncate text-[11px] text-gray-500">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => logout("/login")}
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Logout</span>
              </button>
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
