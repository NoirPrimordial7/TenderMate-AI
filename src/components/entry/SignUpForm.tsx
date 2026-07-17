"use client";

import { ArrowUpRight, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PasswordField, TextField } from "@/components/entry/AuthFields";
import { DockStatus } from "@/components/entry/DockStatus";
import { useAuth } from "@/contexts/AuthContext";
import { isApiError, toFriendlyApiMessage } from "@/services/api";

function signupErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 409) return "An account already exists for this email. Sign in instead.";
    if (error.status === 422) return "Check the form details and try again.";
    if (error.status === 0) return "The service could not be reached. Check your connection and try again.";
    if (error.status >= 500) return "The service is temporarily unavailable. Please try again in a moment.";
  }
  return toFriendlyApiMessage(error, "Account creation failed. Please try again.");
}

export function SignUpForm({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const { signup } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError("Enter your full name, email, and a password with at least 6 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      await signup({ full_name: fullName.trim(), email: email.trim(), password });
      onAuthenticated?.();
    } catch (submitError) {
      setError(signupErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="te-form" noValidate>
      <div className="te-form-heading">
        <h2>Start with one tender.</h2>
        <p className="te-form-subtitle">Create your private workspace and see the decision before you bid.</p>
      </div>
      <TextField label="Full name" type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
      <TextField label="Work email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <PasswordField label="Password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} hint="Minimum 6 characters." minLength={6} required />
      {error ? <DockStatus tone="danger" live="assertive">{error}</DockStatus> : null}
      <button type="submit" disabled={isSubmitting} className="te-primary-button">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        <span>{isSubmitting ? "Creating workspace…" : "Create my workspace"}</span>
        {!isSubmitting ? <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> : null}
      </button>
    </form>
  );
}
