import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HistoryTender } from "@/domain/tender/types";

const riskClass = {
  High: "bg-red-50 text-red-800 ring-red-200",
  Medium: "bg-amber-50 text-amber-800 ring-amber-200",
  Low: "bg-gray-100 text-gray-700 ring-gray-200"
};

const statusClass = {
  Uploaded: "bg-blue-50 text-blue-800 ring-blue-200",
  Extracted: "bg-purple-50 text-purple-800 ring-purple-200",
  Failed: "bg-red-50 text-red-800 ring-red-200",
  Analyzed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

export default function HistoryTable({
  items,
  description = "Previously analyzed tender PDFs using development mock data."
}: {
  items: HistoryTender[];
  description?: string;
}) {
  return (
    <section className="card overflow-hidden" aria-labelledby="history-title">
      <div className="border-b border-gray-200 p-5">
        <p className="muted-label">Saved analyses</p>
        <h1 id="history-title" className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
          Tender history
        </h1>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      </div>
      <div className="hidden grid-cols-[1.3fr_1fr_0.8fr_0.7fr_0.7fr_0.6fr_0.5fr_0.45fr_0.7fr] gap-3 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:grid">
        <span>Tender title</span>
        <span>Organization</span>
        <span>Category</span>
        <span>Upload date</span>
        <span>Deadline</span>
        <span>Status</span>
        <span>Risk</span>
        <span>Fit</span>
        <span>Action</span>
      </div>
      <div className="divide-y divide-gray-200">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid gap-3 px-5 py-5 text-sm lg:grid-cols-[1.3fr_1fr_0.8fr_0.7fr_0.7fr_0.6fr_0.5fr_0.45fr_0.7fr] lg:items-center"
          >
            <div>
              <p className="font-semibold text-gray-950">{item.tenderTitle}</p>
              <p className="mt-1 text-xs text-gray-500 lg:hidden">{item.organization}</p>
            </div>
            <p className="hidden text-gray-700 lg:block">{item.organization}</p>
            <p className="text-gray-600">{item.category}</p>
            <p className="text-gray-600">{item.uploadDate}</p>
            <p className="font-medium text-gray-950">{item.deadline}</p>
            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass[item.status]}`}>
              {item.status}
            </span>
            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${riskClass[item.riskLevel]}`}>
              {item.riskLevel}
            </span>
            <p className="font-semibold text-gray-950">{item.status === "Analyzed" ? `${item.fitScore}%` : "Pending"}</p>
            <Link
              href={`/tender/${item.id}`}
              className="inline-flex w-fit items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:border-gray-400 hover:bg-gray-50"
            >
              {item.status === "Analyzed" ? "View Analysis" : "View Status"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
