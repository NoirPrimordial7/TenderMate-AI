import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { BeforeApplyItem, BeforeApplyStatus } from "@/domain/tender/types";

const statusConfig: Record<BeforeApplyStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  ready: { icon: CheckCircle2, className: "text-emerald-700", label: "Ready" },
  warning: { icon: AlertTriangle, className: "text-amber-700", label: "Check" },
  missing: { icon: XCircle, className: "text-red-700", label: "Missing" }
};

export default function BeforeYouApply({ items }: { items: BeforeApplyItem[] }) {
  return (
    <section className="card p-5" aria-labelledby="before-title">
      <h2 id="before-title" className="section-title">
        Before you apply
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const config = statusConfig[item.status];
          const Icon = config.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <Icon className={`h-5 w-5 flex-none ${config.className}`} aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-gray-950">{item.label}</p>
                <p className={`text-xs font-semibold ${config.className}`}>{config.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
