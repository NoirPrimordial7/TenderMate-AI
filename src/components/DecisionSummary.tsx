import { AlertTriangle, CheckCircle2, Clock, FileWarning } from "lucide-react";

type DecisionSummaryProps = {
  summary: {
    shouldApply: string;
    recommendation: string;
    overallFitScore: number;
    riskLevel: string;
    deadlineUrgency: string;
    missingCriticalRequirements: number;
  };
};

export default function DecisionSummary({ summary }: DecisionSummaryProps) {
  const facts = [
    { label: "Overall Fit Score", value: `${summary.overallFitScore}%`, icon: CheckCircle2 },
    { label: "Risk Level", value: summary.riskLevel, icon: AlertTriangle },
    { label: "Deadline Urgency", value: summary.deadlineUrgency, icon: Clock },
    { label: "Missing Critical Requirements", value: String(summary.missingCriticalRequirements), icon: FileWarning }
  ];

  return (
    <section className="card border-gray-300 p-5" aria-labelledby="decision-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="muted-label">Decision summary</p>
          <h2 id="decision-title" className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
            Should you apply? <span className="text-amber-700">{summary.shouldApply}</span>
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-700">{summary.recommendation}</p>
        </div>
        <div className="flex h-24 w-24 flex-none items-center justify-center rounded-full border-8 border-gray-950 bg-white text-xl font-bold text-gray-950">
          {summary.overallFitScore}%
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((fact) => {
          const Icon = fact.icon;
          return (
            <div key={fact.label} className="rounded-lg bg-gray-50 p-4 ring-1 ring-gray-200">
              <Icon className="h-4 w-4 text-gray-600" aria-hidden="true" />
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">{fact.label}</p>
              <p className="mt-1 text-lg font-semibold text-gray-950">{fact.value}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
