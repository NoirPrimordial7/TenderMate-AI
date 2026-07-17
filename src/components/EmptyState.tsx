import Link from "next/link";
import { FileSearch } from "lucide-react";

export default function EmptyState({
  title,
  description,
  actionHref = "/",
  actionLabel = "Upload tender",
  secondaryActionHref,
  secondaryActionLabel
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
}) {
  return (
    <section className="tm-empty-state" aria-labelledby="empty-title">
      <div className="tm-empty-mark"><FileSearch aria-hidden="true" /></div>
      <h1 id="empty-title">{title}</h1>
      <p>{description}</p>
      <div>
        <Link
          href={actionHref}
          className="tm-button tm-button-dark"
        >
          {actionLabel}
        </Link>
        {secondaryActionHref && secondaryActionLabel ? (
          <Link
            href={secondaryActionHref}
            className="tm-button"
          >
            {secondaryActionLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
