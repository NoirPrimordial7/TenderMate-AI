"use client";

import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/contexts/LocaleContext";
import { apiRequest } from "@/services/api";

type Consent = { allowed: boolean };

export function TrainingConsentSetting() {
  const { user } = useAuth();
  const t = useTranslations("launch");
  const { data, mutate, isLoading } = useSWR<Consent>(user ? ["private", user.id, "training-consent"] : null, () => apiRequest("/preferences/training-consent"));
  const update = async (allowed: boolean) => {
    await mutate(apiRequest<Consent>("/preferences/training-consent", { method: "PATCH", body: { allowed } }), { optimisticData: { allowed }, rollbackOnError: true, revalidate: false });
  };
  return <label className="nl-training-consent"><input type="checkbox" checked={data?.allowed ?? false} disabled={isLoading} onChange={(event) => void update(event.target.checked)} /><span><strong>{t("trainingConsent")}</strong><small>{t("trainingConsentHelp")}</small></span></label>;
}
