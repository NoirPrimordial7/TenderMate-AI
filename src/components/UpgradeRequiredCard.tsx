import Link from "next/link";
import { CreditCard } from "lucide-react";

export default function UpgradeRequiredCard({ className = "" }: { className?: string }) {
  return (
    <section className={`card p-6 text-center sm:p-8 ${className}`} aria-labelledby="upgrade-required-title">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
        <CreditCard className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 id="upgrade-required-title" className="mt-4 text-2xl font-semibold tracking-tight text-gray-950">
        Upgrade required
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
        No analysis credits remain on this account. Upgrade to continue analysing tenders.
      </p>
      <Link
        href="/pricing"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-black"
      >
        View plans
      </Link>
    </section>
  );
}
