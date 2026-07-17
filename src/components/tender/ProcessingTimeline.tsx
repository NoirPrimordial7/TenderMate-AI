"use client";

import { Check, Circle, CircleAlert, LoaderCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "@/contexts/LocaleContext";
import type { ProcessingStage } from "@/services/tenderWorkspace";

export function ProcessingTimeline({ stages }: { stages: ProcessingStage[] }) {
  const t = useTranslations("processing");
  const reduceMotion = useReducedMotion();
  return (
    <ol className="tm-processing-timeline" aria-label={t("timelineLabel")}>
      {stages.map((stage, index) => (
        <motion.li key={stage.id} className={`tm-stage tm-stage-${stage.state}`} initial={{ opacity: 0, x: reduceMotion ? 0 : -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : index * 0.035 }}>
          <span className="tm-stage-icon">{stage.state === "complete" ? <Check aria-hidden="true"/> : stage.state === "active" ? <LoaderCircle aria-hidden="true"/> : stage.state === "failed" || stage.state === "warning" ? <CircleAlert aria-hidden="true"/> : <Circle aria-hidden="true"/>}</span>
          <span><strong>{t(`stage.${stage.id}`)}</strong><small>{t(`stageState.${stage.state}`)}</small></span>
        </motion.li>
      ))}
    </ol>
  );
}
