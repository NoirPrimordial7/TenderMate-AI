"use client";

import { usePathname } from "next/navigation";
import { MessageSquarePlus, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import { usePerformanceMode } from "@/contexts/PerformanceModeContext";
import { apiRequest } from "@/services/api";

const categories = ["incorrect", "accuracy", "missing", "design", "feature", "pricing", "performance", "technical", "other"] as const;

function viewportClass() {
  if (window.innerWidth < 640) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  if (window.innerWidth < 1600) return "laptop";
  return "desktop";
}

export function ProductFeedback() {
  const pathname = usePathname();
  const { activeLocale } = useLocale();
  const { effectiveMode } = usePerformanceMode();
  const t = useTranslations("launch");
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof categories)[number]>("other");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("select")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
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
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 10) return;
    setStatus("sending");
    try {
      const tenderMatch = pathname.match(/^\/tender\/([^/]+)/);
      await apiRequest("/feedback", {
        method: "POST",
        body: {
          category,
          message: message.trim(),
          email: email.trim() || null,
          locale: activeLocale,
          page_path: pathname,
          tender_id: tenderMatch?.[1] ?? null,
          performance_mode: effectiveMode,
          viewport_class: viewportClass()
        }
      });
      setStatus("success");
      setMessage("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <button ref={triggerRef} type="button" className="nl-feedback-trigger" onClick={() => { setStatus("idle"); setOpen(true); }}>
        <MessageSquarePlus aria-hidden="true" /><span>{t("feedback")}</span>
      </button>
      {open ? <div className="nl-feedback-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div ref={dialogRef} className="nl-feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="nl-feedback-title">
          <header><div><p className="tm-eyebrow">{t("publicBeta")}</p><h2 id="nl-feedback-title">{t("feedbackTitle")}</h2><p>{t("feedbackMessage")}</p></div><button type="button" onClick={() => setOpen(false)} aria-label={t("feedbackClose")}><X aria-hidden="true" /></button></header>
          <form onSubmit={submit}>
            <label>{t("feedbackCategory")}<select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>{categories.map((item) => <option key={item} value={item}>{t(`feedbackCategories.${item}`)}</option>)}</select></label>
            <label>{t("feedbackDetails")}<textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={2000} required /></label>
            <label>{t("feedbackEmail")}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} /></label>
            {status === "success" ? <p role="status" className="nl-feedback-success">{t("feedbackSuccess")}</p> : null}
            {status === "error" ? <p role="alert" className="nl-feedback-error">{t("feedbackError")}</p> : null}
            <button type="submit" className="tm-button tm-button-dark" disabled={status === "sending" || message.trim().length < 10}>{t("feedbackSubmit")}</button>
          </form>
        </div>
      </div> : null}
    </>
  );
}
