"use client";

import { useTranslations } from "@/contexts/LocaleContext";

export const workspaceTabs = ["overview", "eligibility", "documents", "financials", "technical", "dates", "risks", "source", "ask"] as const;
export type WorkspaceTab = (typeof workspaceTabs)[number];

export function WorkspaceNavigation({ activeTab, onChange }: { activeTab: WorkspaceTab; onChange: (tab: WorkspaceTab) => void }) {
  const t = useTranslations("workspace");
  return (
    <nav className="tm-v2-tabs" aria-label={t("navigation")}>
      {workspaceTabs.map((tab) => (
        <button key={tab} type="button" aria-current={activeTab === tab ? "page" : undefined} onClick={() => onChange(tab)}>
          {t(`tabs.${tab}`)}
        </button>
      ))}
    </nav>
  );
}
