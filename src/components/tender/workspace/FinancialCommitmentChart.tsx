"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "@/contexts/LocaleContext";
import type { FinancialItem } from "@/domain/tender/types";
import { getFinancialChartItems } from "@/services/tenderReport";

const formatInr = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export function FinancialCommitmentChart({ items }: { items: FinancialItem[] }) {
  const t = useTranslations("workspaceV2");
  const reduceMotion = useReducedMotion();
  const data = getFinancialChartItems(items);
  if (data.length < 2) return null;
  const chartData = data.map(({ item, amount }) => ({ name: item.label, amount }));
  return <figure className="tm-v2-chart"><figcaption><strong>{t("financialChart")}</strong><span>{t("financialChartExplain")}</span></figcaption><div className="tm-v2-chart-canvas" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 20 }}><CartesianGrid stroke="#d9d7d0" horizontal={false}/><XAxis type="number" tickFormatter={(value) => formatInr(Number(value))} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => [formatInr(Number(value)), t("amount")]} /><Bar dataKey="amount" fill="#146CFF" radius={[0, 4, 4, 0]} isAnimationActive={!reduceMotion}/></BarChart></ResponsiveContainer></div><ul className="tm-v2-chart-summary">{chartData.map((item) => <li key={item.name}><span>{item.name}</span><strong>{formatInr(item.amount)}</strong></li>)}</ul></figure>;
}
