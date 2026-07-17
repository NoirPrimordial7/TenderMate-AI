"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AskTenderMateReport } from "@/components/tender/workspace/AskTenderMateReport";
import { DatesReport } from "@/components/tender/workspace/DatesReport";
import { DocumentsReport } from "@/components/tender/workspace/DocumentsReport";
import { EligibilityReport } from "@/components/tender/workspace/EligibilityReport";
import { FinancialReport } from "@/components/tender/workspace/FinancialReport";
import { OverviewReport } from "@/components/tender/workspace/OverviewReport";
import { RisksReport } from "@/components/tender/workspace/RisksReport";
import { SourceEvidenceDrawer } from "@/components/tender/workspace/SourceEvidenceDrawer";
import { SourceReport } from "@/components/tender/workspace/SourceReport";
import { TechnicalReport } from "@/components/tender/workspace/TechnicalReport";
import { TenderWorkspaceHeader } from "@/components/tender/workspace/TenderWorkspaceHeader";
import { WorkspaceNavigation, type WorkspaceTab } from "@/components/tender/workspace/WorkspaceNavigation";
import type { SourceReference, TenderRecordView } from "@/domain/tender/types";
import { reportFromAnalysis } from "@/services/tenderReport";

export function TenderWorkspace({ tender }: { tender: TenderRecordView }) {
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [source, setSource] = useState<SourceReference | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openSource = useCallback((next: SourceReference) => { setSource(next); setDrawerOpen(true); }, []);
  const openFullSource = useCallback(() => { setDrawerOpen(false); setActiveTab("source"); }, []);
  if (!tender.analysis) return null;
  const analysis = reportFromAnalysis(tender.analysis);
  return (
    <div className="tm-tender-workspace tm-tender-workspace-v2">
      <TenderWorkspaceHeader tender={{ ...tender, analysis }} onOpenSource={() => { setSource(null); setActiveTab("source"); }}/>
      <WorkspaceNavigation activeTab={activeTab} onChange={setActiveTab}/>
      <AnimatePresence mode="wait">
        <motion.main key={activeTab} className="tm-v2-panel" initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.22 }}>
          {activeTab === "overview" ? <OverviewReport analysis={analysis}/> : null}
          {activeTab === "eligibility" ? <EligibilityReport analysis={analysis} onSource={openSource}/> : null}
          {activeTab === "documents" ? <DocumentsReport analysis={analysis} onSource={openSource}/> : null}
          {activeTab === "financials" ? <FinancialReport analysis={analysis} onSource={openSource}/> : null}
          {activeTab === "technical" ? <TechnicalReport analysis={analysis} onSource={openSource}/> : null}
          {activeTab === "dates" ? <DatesReport analysis={analysis} onSource={openSource}/> : null}
          {activeTab === "risks" ? <RisksReport analysis={analysis} onSource={openSource}/> : null}
          {activeTab === "source" ? <SourceReport tenderId={tender.id} pageCount={tender.pageCount} source={source}/> : null}
          {activeTab === "ask" ? <AskTenderMateReport/> : null}
        </motion.main>
      </AnimatePresence>
      <SourceEvidenceDrawer tenderId={tender.id} pageCount={tender.pageCount} source={source} open={drawerOpen} onClose={closeDrawer} onOpenFull={openFullSource}/>
    </div>
  );
}
