"use client";

import { Copy, Download, RefreshCw } from "lucide-react";

export default function ProposalDraft({ draft }: { draft: string }) {
  const copyDraft = async () => {
    await navigator.clipboard.writeText(draft);
  };

  return (
    <section className="card p-5" aria-labelledby="proposal-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="proposal-title" className="section-title">
          Proposal draft
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyDraft}
            className="inline-flex items-center gap-2 rounded-md bg-gray-950 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy Draft
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Regenerate Draft
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
            <Download className="h-4 w-4" aria-hidden="true" />
            Download later
          </button>
        </div>
      </div>
      <textarea
        value={draft}
        readOnly
        className="mt-4 min-h-72 w-full resize-y rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-800 outline-none focus:ring-2 focus:ring-gray-950"
        aria-label="Proposal draft text"
      />
    </section>
  );
}
