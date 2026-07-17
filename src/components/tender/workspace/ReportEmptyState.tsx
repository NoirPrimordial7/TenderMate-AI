import { FileQuestion } from "lucide-react";

export function ReportEmptyState({ title, description }: { title: string; description: string }) {
  return <div className="tm-v2-empty"><FileQuestion aria-hidden="true" /><div><h2>{title}</h2><p>{description}</p></div></div>;
}
