import Link from "next/link";
import { FileSearch } from "lucide-react";

export default function EmptyState({
  title,
  description,
  actionHref = "/",
  actionLabel = "Upload tender"
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="card p-8 text-center" aria-labelledby="empty-title">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
        <FileSearch className="h-6 w-6 text-gray-600" aria-hidden="true" />
      </div>
      <h1 id="empty-title" className="mt-4 text-2xl font-semibold tracking-tight text-gray-950">
        {title}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">{description}</p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-black"
      >
        {actionLabel}
      </Link>
    </section>
  );
}
