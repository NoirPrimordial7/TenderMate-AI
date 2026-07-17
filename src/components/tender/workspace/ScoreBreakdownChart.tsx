"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "@/contexts/LocaleContext";
import type { ReadinessScores } from "@/domain/tender/types";

const scoreKeys = ["eligibilityScore", "documentsScore", "financialScore", "technicalScore", "timelineScore"] as const;

export function ScoreBreakdownChart({ scores }: { scores: ReadinessScores }) {
  const t = useTranslations("workspaceV2");
  const reduceMotion = useReducedMotion();
  const data = scoreKeys.flatMap((key) => typeof scores[key] === "number" ? [{ key, name: t(`readiness.${key}`), value: scores[key] as number }] : []);
  if (!data.length) return null;
  return (
    <figure className="tm-v2-chart">
      <figcaption><strong>{t("readinessTitle")}</strong><span>{t("readinessExplain")}</span></figcaption>
      <div className="tm-v2-chart-canvas" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}><CartesianGrid stroke="#d9d7d0" horizontal={false}/><XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => [`${value}%`, t("score")]} /><Bar dataKey="value" fill="#6C4DFF" radius={[0, 4, 4, 0]} isAnimationActive={!reduceMotion} /></BarChart></ResponsiveContainer>
      </div>
      <ul className="tm-v2-chart-summary">{data.map((item) => <li key={item.key}><span>{item.name}</span><strong>{item.value}%</strong></li>)}</ul>
    </figure>
  );
}
