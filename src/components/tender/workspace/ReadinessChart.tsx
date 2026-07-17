"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "@/contexts/LocaleContext";
import type { StatusCounts } from "@/services/tenderReport";

export function ReadinessChart({ counts }: { counts: StatusCounts }) {
  const t = useTranslations("workspaceV2");
  const reduceMotion = useReducedMotion();
  if (!counts.total) return null;
  const data = [{ name: t("documents"), ready: counts.ready, notVerified: counts.notVerified, missing: counts.missing }];
  return <figure className="tm-v2-mini-chart"><figcaption>{t("documentDistribution")}</figcaption><div aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="name" hide /><Tooltip /><Bar dataKey="ready" stackId="status" fill="#D7FF33" isAnimationActive={!reduceMotion}/><Bar dataKey="notVerified" stackId="status" fill="#146CFF" isAnimationActive={!reduceMotion}/><Bar dataKey="missing" stackId="status" fill="#FF5A36" isAnimationActive={!reduceMotion}/></BarChart></ResponsiveContainer></div><p>{t("statusSummary", { ready: counts.ready, unverified: counts.notVerified, missing: counts.missing })}</p></figure>;
}
