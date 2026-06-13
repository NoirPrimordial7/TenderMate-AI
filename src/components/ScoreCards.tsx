"use client";

import { ScoreItem } from "@/domain/tender/types";

export default function ScoreCards({ scores }: { scores: ScoreItem[] }) {
  return (
    <section className="card p-5" aria-labelledby="scores-title">
      <h2 id="scores-title" className="section-title">
        Fit and readiness scores
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {scores.map((score) => (
          <div key={score.label} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-950">{score.label}</p>
              <p className="text-sm font-bold text-gray-950">{score.display}</p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gray-950"
                style={{ width: `${score.value}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
