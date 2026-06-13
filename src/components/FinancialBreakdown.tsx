"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import SourceButton from "@/components/SourceButton";
import { FinancialItem, SourceReference } from "@/domain/tender/types";

export default function FinancialBreakdown({
  items,
  onSelectSource
}: {
  items: FinancialItem[];
  onSelectSource: (source: SourceReference) => void;
}) {
  const chartData = items
    .filter((item) => item.chartAmount)
    .map((item) => ({ name: item.label.replace("Estimated ", ""), amount: item.chartAmount ?? 0 }));

  return (
    <section className="card p-5" aria-labelledby="financial-title">
      <h2 id="financial-title" className="section-title">
        Financial breakdown
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-gray-950">{item.value}</p>
            {item.note ? <p className="mt-1 text-sm text-gray-600">{item.note}</p> : null}
            <div className="mt-4">
              <SourceButton source={item.source} onSelect={onSelectSource} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 h-56 rounded-lg border border-gray-200 bg-white p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Amount"]}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <Bar dataKey="amount" fill="#111827" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
