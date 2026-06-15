"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { isApiError, toFriendlyApiMessage } from "@/services/api";

function getNextPath() {
  if (typeof window === "undefined") return "/dashboard";
  return new URLSearchParams(window.location.search).get("next") || "/dashboard";
}

function signupErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 409) return "Email already exists. Try logging in instead.";
    if (error.status === 422) return "Please check the form fields and try again.";
    if (error.status === 0 || error.status >= 500) return "Backend unavailable. Please try again after FastAPI is running.";
  }

  return toFriendlyApiMessage(error, "Signup failed. Please try again.");
}

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, signup } = useAuth();
  const [fullName, setFullName] = useState("");
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

    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError("Enter your full name, email, and a password with at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({
        full_name: fullName.trim(),
        email: email.trim(),
        password
      });
      router.replace(getNextPath());
    } catch (submitError) {
      setError(signupErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="card w-full max-w-md p-6 sm:p-8" aria-labelledby="signup-title">
          <div className="mb-6">
            <p className="muted-label">Create account</p>
            <h1 id="signup-title" className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
              Sign up
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">Create a TenderMate account for protected tender history.</p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-gray-800">Full name</span>
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-950 outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-200"
              />
            </label>
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
                autoComplete="new-password"
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
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
              Create account
            </button>
          </form>

          <p className="mt-5 text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-gray-950 underline-offset-4 hover:underline">
              Login
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
