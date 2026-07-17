import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

type DockStatusProps = {
  tone?: "neutral" | "success" | "warning" | "danger";
  title?: string;
  children: React.ReactNode;
  live?: "polite" | "assertive";
};

const toneConfig = {
  neutral: { icon: Info, className: "te-status-neutral" },
  success: { icon: CheckCircle2, className: "te-status-success" },
  warning: { icon: TriangleAlert, className: "te-status-warning" },
  danger: { icon: AlertCircle, className: "te-status-danger" }
};

export function DockStatus({
  tone = "neutral",
  title,
  children,
  live = "polite"
}: DockStatusProps) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <div
      className={`te-status ${config.className}`}
      role={tone === "danger" ? "alert" : "status"}
      aria-live={live}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? "mt-0.5" : ""}>{children}</div>
      </div>
    </div>
  );
}
