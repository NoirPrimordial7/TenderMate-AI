import SourceButton from "@/components/SourceButton";
import { RiskItem, SourceReference } from "@/domain/tender/types";

const levelClass = {
  High: "bg-red-50 text-red-800 ring-red-200",
  Medium: "bg-amber-50 text-amber-800 ring-amber-200",
  Low: "bg-gray-100 text-gray-700 ring-gray-200"
};

export default function RiskAnalysis({
  risks,
  onSelectSource
}: {
  risks: RiskItem[];
  onSelectSource: (source: SourceReference) => void;
}) {
  return (
    <section className="card p-5" aria-labelledby="risks-title">
      <h2 id="risks-title" className="section-title">
        Risk analysis
      </h2>
      <div className="mt-4 grid gap-4">
        {risks.map((risk) => (
          <article key={risk.title} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-gray-950">{risk.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-700">{risk.explanation}</p>
              </div>
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${levelClass[risk.level]}`}>
                {risk.level} risk
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span>Page {risk.source.page}, Clause {risk.source.clause}</span>
              <SourceButton source={risk.source} onSelect={onSelectSource} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
