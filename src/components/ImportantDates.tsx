import { DateItem } from "@/domain/tender/types";

export default function ImportantDates({ dates }: { dates: DateItem[] }) {
  return (
    <section className="card p-5" aria-labelledby="dates-title">
      <h2 id="dates-title" className="section-title">
        Important dates
      </h2>
      <ol className="mt-5 space-y-4">
        {dates.map((item, index) => (
          <li key={item.label} className="relative flex gap-4">
            {index !== dates.length - 1 ? <span className="absolute left-2.5 top-6 h-full w-px bg-gray-200" aria-hidden="true" /> : null}
            <span className={`mt-1 h-5 w-5 flex-none rounded-full border-4 ${
              item.status === "done" ? "border-gray-950 bg-gray-950" : item.status === "unknown" ? "border-gray-300 bg-white" : "border-amber-500 bg-white"
            }`} />
            <div className="min-w-0 pb-1">
              <p className="font-semibold text-gray-950">{item.label}</p>
              <p className="mt-1 text-sm text-gray-600">{item.date}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
