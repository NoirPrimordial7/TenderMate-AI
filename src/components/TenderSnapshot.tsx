import { Building2, CalendarClock, IndianRupee, MapPin } from "lucide-react";
import { TenderSnapshot as TenderSnapshotType } from "@/domain/tender/types";

const detailClass = "rounded-lg border border-gray-200 bg-gray-50 p-4";

export default function TenderSnapshot({ tender }: { tender: TenderSnapshotType }) {
  const details = [
    { label: "Tender ID", value: tender.tenderId },
    { label: "Organization", value: tender.organization, icon: Building2 },
    { label: "Location", value: tender.location, icon: MapPin },
    { label: "Category", value: tender.category },
    { label: "Estimated Value", value: tender.estimatedValue, icon: IndianRupee },
    { label: "EMD Amount", value: tender.emdAmount },
    { label: "Submission Deadline", value: tender.submissionDeadline, icon: CalendarClock },
    { label: "Contract Duration", value: tender.contractDuration }
  ];

  return (
    <section className="card p-5" aria-labelledby="snapshot-title">
      <p className="muted-label">Tender snapshot</p>
      <h1 id="snapshot-title" className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
        {tender.title}
      </h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {details.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={detailClass}>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                {item.label}
              </div>
              <p className="mt-2 text-sm font-semibold leading-5 text-gray-950">{item.value}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
