"use client";

import { ArrowUpRight } from "lucide-react";
import type { SourceReference } from "@/domain/tender/types";
import { useTranslations } from "@/contexts/LocaleContext";

export function SourceAction({ source, onSelect }: { source?: SourceReference | null; onSelect: (source: SourceReference) => void }) {
  const t = useTranslations("workspaceV2");
  if (!source) return <span className="tm-v2-source-missing">{t("sourceMissing")}</span>;
  return (
    <button type="button" className="tm-v2-source-action" onClick={() => onSelect(source)}>
      {t("viewSource", { page: source.page })}<ArrowUpRight aria-hidden="true" />
    </button>
  );
}
