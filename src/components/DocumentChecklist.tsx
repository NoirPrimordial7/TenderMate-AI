import SourceButton from "@/components/SourceButton";
import { DocumentRequirement, SourceReference } from "@/domain/tender/types";

const statusClass: Record<string, string> = {
  Ready: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Missing: "bg-red-50 text-red-800 ring-red-200",
  "Not Verified": "bg-amber-50 text-amber-800 ring-amber-200"
};

export default function DocumentChecklist({
  documents,
  onSelectSource
}: {
  documents: DocumentRequirement[];
  onSelectSource: (source: SourceReference) => void;
}) {
  return (
    <section className="card p-5" aria-labelledby="documents-title">
      <h2 id="documents-title" className="section-title">
        Required documents checklist
      </h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
        <div className="hidden grid-cols-[1.5fr_0.7fr_0.8fr_1fr_0.7fr] gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
          <span>Document</span>
          <span>Type</span>
          <span>Status</span>
          <span>Source</span>
          <span>Action</span>
        </div>
        {documents.map((document) => (
          <div
            key={document.name}
            className="grid gap-3 border-t border-gray-200 px-4 py-4 text-sm md:grid-cols-[1.5fr_0.7fr_0.8fr_1fr_0.7fr] md:items-center"
          >
            <p className="font-semibold text-gray-950">{document.name}</p>
            <span className="w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
              {document.priority}
            </span>
            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass[document.status]}`}>
              {document.status}
            </span>
            <p className="text-gray-600">
              Page {document.source.page}, Clause {document.source.clause}
            </p>
            <SourceButton source={document.source} onSelect={onSelectSource} />
          </div>
        ))}
      </div>
    </section>
  );
}
