"use client";

import { Eye, EyeOff } from "lucide-react";
import { InputHTMLAttributes, useId, useState } from "react";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id"> & {
  label: string;
  hint?: string;
};

export function TextField({ label, hint, ...props }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <label className="te-field" htmlFor={id}>
      <span className="te-field-label">{label}</span>
      <input id={id} className="te-input" aria-describedby={hintId} {...props} />
      {hint ? <span id={hintId} className="te-field-hint">{hint}</span> : null}
    </label>
  );
}

export function PasswordField({ label, hint, ...props }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="te-field" htmlFor={id}>
      <span className="te-field-label">{label}</span>
      <span className="relative block">
        <input
          id={id}
          type={isVisible ? "text" : "password"}
          className="te-input pr-12"
          aria-describedby={hintId}
          {...props}
        />
        <button
          type="button"
          className="te-password-toggle"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
        >
          {isVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </span>
      {hint ? <span id={hintId} className="te-field-hint">{hint}</span> : null}
    </label>
  );
}
