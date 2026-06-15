"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { isApiError, toFriendlyApiMessage } from "@/services/api";

function getNextPath() {
  if (typeof window === "undefined") return "/dashboard";
  return new URLSearchParams(window.location.search).get("next") || "/dashboard";
}

function loginErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 401) return "Invalid email or password.";
    if (error.status === 403) return "This account is inactive.";
    if (error.status === 0 || error.status >= 500) return "Backend unavailable. Please try again after FastAPI is running.";
  }

  return toFriendlyApiMessage(error, "Login failed. Please try again.");
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getNextPath());
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      router.replace(getNextPath());
    } catch (submitError) {
      setError(loginErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="card w-full max-w-md p-6 sm:p-8" aria-labelledby="login-title">
          <div className="mb-6">
            <p className="muted-label">Account access</p>
            <h1 id="login-title" className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
              Login
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">Use your TenderMate account to view protected tenders.</p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-gray-800">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-950 outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-200"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-gray-800">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-950 outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-200"
              />
            </label>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
              Sign in
            </button>
          </form>

          <p className="mt-5 text-sm text-gray-600">
            New to TenderMate?{" "}
            <Link href="/signup" className="font-semibold text-gray-950 underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
