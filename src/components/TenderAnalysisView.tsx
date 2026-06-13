"use client";

import { AlertCircle } from "lucide-react";
import { useState } from "react";
import BeforeYouApply from "@/components/BeforeYouApply";
import DecisionSummary from "@/components/DecisionSummary";
import DocumentChecklist from "@/components/DocumentChecklist";
import EligibilityAnalysis from "@/components/EligibilityAnalysis";
import FinancialBreakdown from "@/components/FinancialBreakdown";
import ImportantDates from "@/components/ImportantDates";
import PdfSourceViewer from "@/components/PdfSourceViewer";
import ProposalDraft from "@/components/ProposalDraft";
import QuestionsToAsk from "@/components/QuestionsToAsk";
import RiskAnalysis from "@/components/RiskAnalysis";
import ScoreCards from "@/components/ScoreCards";
import TechnicalRequirements from "@/components/TechnicalRequirements";
import TenderSnapshot from "@/components/TenderSnapshot";
import { SourceReference, TenderAnalysis } from "@/domain/tender/types";

function MissingInformation({ items }: { items: string[] }) {
  return (
    <section className="card p-5" aria-labelledby="missing-title">
      <h2 id="missing-title" className="section-title">
        Missing information
      </h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-amber-700" aria-hidden="true" />
            <p className="text-sm font-medium leading-5 text-gray-950">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function TenderAnalysisView({ analysis }: { analysis: TenderAnalysis }) {
  const [selectedSource, setSelectedSource] = useState<SourceReference | null>(null);

  return (
    <>
      <div className="grid gap-5">
        <TenderSnapshot tender={analysis.snapshot} />
        <DecisionSummary summary={analysis.decision} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid min-w-0 gap-6">
          <ScoreCards scores={analysis.scores} />
          <BeforeYouApply items={analysis.beforeApply} />
          <DocumentChecklist documents={analysis.documents} onSelectSource={setSelectedSource} />
          <EligibilityAnalysis requirements={analysis.eligibility} onSelectSource={setSelectedSource} />
          <FinancialBreakdown items={analysis.financials} onSelectSource={setSelectedSource} />
          <TechnicalRequirements requirements={analysis.technical} onSelectSource={setSelectedSource} />
          <ImportantDates dates={analysis.dates} />
          <RiskAnalysis risks={analysis.risks} onSelectSource={setSelectedSource} />
          <MissingInformation items={analysis.missingInformation} />
          <QuestionsToAsk questions={analysis.departmentQuestions} />
          <ProposalDraft draft={analysis.proposalDraft} />
        </div>

        <PdfSourceViewer source={selectedSource} />
      </div>
    </>
  );
}
