import SourceButton from "@/components/SourceButton";
import { SourceReference, TechnicalRequirement } from "@/domain/tender/types";

export default function TechnicalRequirements({
  requirements,
  onSelectSource
}: {
  requirements: TechnicalRequirement[];
  onSelectSource: (source: SourceReference) => void;
}) {
  return (
    <section className="card p-5" aria-labelledby="technical-title">
      <h2 id="technical-title" className="section-title">
        Technical requirements
      </h2>
      <div className="mt-4 grid gap-3">
        {requirements.map((item) => (
          <div key={item.requirement} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-gray-950">{item.requirement}</p>
              <p className="mt-1 text-sm text-gray-600">
                Page {item.source.page}, Clause {item.source.clause}
              </p>
            </div>
            <SourceButton source={item.source} onSelect={onSelectSource} />
          </div>
        ))}
      </div>
    </section>
  );
}
