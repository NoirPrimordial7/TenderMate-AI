"use client";

import { useEffect, useRef, useState } from "react";

type Props = { target: string; action: string; effect: string; confirmation: string; onConfirm(reason: string): Promise<void> };

export function AdminActionDialog({ target, action, effect, confirmation, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null); const [reason, setReason] = useState(""); const [typed, setTyped] = useState(""); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  useEffect(() => () => dialog.current?.close(), []);
  async function submit() { if (typed !== confirmation || reason.trim().length < 3) return; setPending(true); setError(""); try { await onConfirm(reason.trim()); dialog.current?.close(); setReason(""); setTyped(""); } catch { setError("The action could not be completed safely."); } finally { setPending(false); } }
  return <><button className="na-danger-button" type="button" onClick={() => dialog.current?.showModal()}>{action}</button><dialog className="na-dialog" ref={dialog} aria-labelledby={`dialog-${confirmation}`}><h2 id={`dialog-${confirmation}`}>{action}</h2><dl><div><dt>Target</dt><dd>{target}</dd></div><div><dt>Effect</dt><dd>{effect}</dd></div><div><dt>Reversibility</dt><dd>Review carefully; an immutable audit event will be recorded.</dd></div></dl><label>Reason<textarea maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label><label>Type <strong>{confirmation}</strong> to confirm<input value={typed} onChange={(event) => setTyped(event.target.value)} /></label>{error ? <p role="alert">{error}</p> : null}<div><button type="button" onClick={() => dialog.current?.close()}>Cancel</button><button type="button" disabled={pending || typed !== confirmation || reason.trim().length < 3} onClick={() => void submit()}>{pending ? "Working…" : action}</button></div></dialog></>;
}
