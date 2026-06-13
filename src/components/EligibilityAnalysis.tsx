import SourceButton from "@/components/SourceButton";
import { EligibilityRequirement, SourceReference } from "@/domain/tender/types";

export default function EligibilityAnalysis({
  requirements,
  onSelectSource
}: {
  requirements: EligibilityRequirement[];
  onSelectSource: (source: SourceReference) => void;
}) {
  return (
    <section className="card p-5" aria-labelledby="eligibility-title">
      <h2 id="eligibility-title" className="section-title">
        Eligibility analysis
      </h2>
      <div className="mt-4 grid gap-4">
        {requirements.map((requirement) => (
          <article key={requirement.title} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-gray-950">{requirement.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-700">“{requirement.text}”</p>
              </div>
              <span className="w-fit rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800 ring-1 ring-red-200">
                {requirement.impact} impact
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span>User status: {requirement.userStatus}</span>
              <span>Page {requirement.source.page}, Clause {requirement.source.clause}</span>
              <SourceButton source={requirement.source} onSelect={onSelectSource} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
