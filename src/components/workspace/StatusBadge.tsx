import type { ReactNode } from "react";

export type StatusTone = "neutral" | "blue" | "violet" | "lime" | "orange" | "danger";

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: StatusTone }) {
  return <span className={`tm-status-badge tm-status-${tone}`}>{children}</span>;
}
