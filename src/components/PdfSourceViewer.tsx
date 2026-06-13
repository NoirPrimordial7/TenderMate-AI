import { FileText } from "lucide-react";
import { SourceReference } from "@/domain/tender/types";

export default function PdfSourceViewer({ source }: { source: SourceReference | null }) {
  return (
    <aside className="card p-5 lg:sticky lg:top-24" aria-labelledby="source-viewer-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="muted-label">PDF source viewer</p>
          <h2 id="source-viewer-title" className="mt-1 text-lg font-semibold text-gray-950">
            Source reference
          </h2>
        </div>
        <FileText className="h-5 w-5 text-gray-500" aria-hidden="true" />
      </div>

      {!source ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="text-sm font-medium text-gray-950">Select any View Source button to inspect the original tender clause.</p>
          <p className="mt-2 text-xs leading-5 text-gray-500">The live PDF renderer will be connected after parsing is added.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 ring-1 ring-gray-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Page {source.page} · Clause {source.clause}
            </p>
            <h3 className="mt-2 font-semibold text-gray-950">{source.title}</h3>
            <p className="mt-3 rounded-md bg-amber-100 px-3 py-2 text-sm leading-6 text-gray-900">{source.text}</p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-100 p-4">
            <div className="mx-auto min-h-[430px] max-w-[270px] rounded-sm bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <div className="mb-4 flex items-center justify-between text-[10px] font-semibold text-gray-500">
                <span>Tender PDF</span>
                <span>Page {source.page}</span>
              </div>
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="h-2 rounded-full bg-gray-200" style={{ width: `${92 - index * 5}%` }} />
                ))}
                <div className="my-4 rounded-md bg-amber-200/90 p-3 ring-1 ring-amber-300">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                    Clause {source.clause}
                  </p>
                  <p className="mt-2 text-[11px] leading-4 text-amber-950">{source.text}</p>
                </div>
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={`after-${index}`} className="h-2 rounded-full bg-gray-200" style={{ width: `${86 - (index % 5) * 7}%` }} />
                ))}
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-gray-500">Source preview based on extracted tender text</p>
          </div>
        </div>
      )}
    </aside>
  );
}
