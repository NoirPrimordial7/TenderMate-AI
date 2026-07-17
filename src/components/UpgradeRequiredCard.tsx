"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { useTranslations } from "@/contexts/LocaleContext";

export default function UpgradeRequiredCard({ className = "" }: { className?: string }) {
  const t = useTranslations("pricing");
  return (
    <section className={`tm-upgrade-state ${className}`} aria-labelledby="upgrade-required-title">
      <CreditCard aria-hidden="true" />
      <h2 id="upgrade-required-title">{t("upgradeRequiredTitle")}</h2>
      <p>{t("upgradeRequiredCopy")}</p>
      <Link href="/pricing" className="tm-button tm-button-dark">{t("viewPlans")}</Link>
    </section>
  );
}
