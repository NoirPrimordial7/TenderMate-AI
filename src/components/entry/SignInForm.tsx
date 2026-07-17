"use client";

import { ArrowUpRight, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { PasswordField, TextField } from "@/components/entry/AuthFields";
import { DockStatus } from "@/components/entry/DockStatus";
import { useAuth } from "@/contexts/AuthContext";
import { isApiError, toFriendlyApiMessage } from "@/services/api";

function loginErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 401) return "Invalid email or password.";
    if (error.status === 403) return "This account is inactive.";
    if (error.status === 423) return "This account is temporarily locked. Please try again later.";
    if (error.status === 0) return "The service could not be reached. Check your connection and try again.";
    if (error.status >= 500) return "The service is temporarily unavailable. Please try again in a moment.";
  }

  return toFriendlyApiMessage(error, "Sign in failed. Please try again.");
}

export function SignInForm({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      onAuthenticated?.();
    } catch (submitError) {
      setError(loginErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="te-form" noValidate>
      <div className="te-form-heading">
        <p className="te-kicker">Access protocol / 01</p>
        <h2>Enter your workspace.</h2>
      </div>
      <TextField
        label="Work email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <PasswordField
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      {error ? <DockStatus tone="danger" live="assertive">{error}</DockStatus> : null}
      <button type="submit" disabled={isSubmitting} className="te-primary-button">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        <span>{isSubmitting ? "Authenticating…" : "Sign in"}</span>
        {!isSubmitting ? <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> : null}
      </button>
    </form>
  );
}
