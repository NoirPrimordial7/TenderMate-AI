export type RiskLevel = "Low" | "Medium" | "High";
export type RequirementStatus = "Ready" | "Missing" | "Not Verified";
export type RequirementPriority = "Required" | "Optional";
export type BeforeApplyStatus = "ready" | "warning" | "missing";

export type TenderSnapshot = {
  title: string;
  tenderId: string;
  organization: string;
  location: string;
  category: string;
  estimatedValue: string;
  emdAmount: string;
  submissionDeadline: string;
  contractDuration: string;
};

export type DecisionSummary = {
  shouldApply: string;
  recommendation: string;
  overallFitScore: number;
  riskLevel: RiskLevel;
  deadlineUrgency: RiskLevel;
  missingCriticalRequirements: number;
};

export type SourceReference = {
  page: number;
  clause: string;
  title: string;
  text: string;
};

export type DocumentRequirement = {
  name: string;
  priority: RequirementPriority;
  status: RequirementStatus;
  source: SourceReference;
};

export type EligibilityRequirement = {
  title: string;
  text: string;
  impact: RiskLevel;
  userStatus: RequirementStatus;
  source: SourceReference;
};

export type RiskItem = {
  title: string;
  level: RiskLevel;
  explanation: string;
  source: SourceReference;
};

export type TechnicalRequirement = {
  requirement: string;
  source: SourceReference;
};

export type DateItem = {
  label: string;
  date: string;
  status?: "done" | "upcoming" | "unknown";
};

export type FinancialItem = {
  label: string;
  value: string;
  note?: string;
  chartAmount?: number;
  source: SourceReference;
};

export type ScoreItem = {
  label: string;
  value: number;
  display: string;
};

export type BeforeApplyItem = {
  label: string;
  status: BeforeApplyStatus;
};

export type TenderAnalysis = {
  id: string;
  snapshot: TenderSnapshot;
  decision: DecisionSummary;
  scores: ScoreItem[];
  beforeApply: BeforeApplyItem[];
  documents: DocumentRequirement[];
  eligibility: EligibilityRequirement[];
  financials: FinancialItem[];
  technical: TechnicalRequirement[];
  dates: DateItem[];
  risks: RiskItem[];
  missingInformation: string[];
  departmentQuestions: string[];
  proposalDraft: string;
};

export type HistoryTender = {
  id: string;
  tenderTitle: string;
  organization: string;
  uploadDate: string;
  deadline: string;
  status: "Uploaded" | "Analyzed" | "Needs Review" | "High Risk";
  riskLevel: RiskLevel;
  fitScore: number;
  category: string;
};

export type TenderRecordView = {
  id: string;
  title: string;
  status: string;
  analysis: TenderAnalysis | null;
  createdAt: string;
  updatedAt: string;
  originalFileName?: string | null;
  errorMessage?: string | null;
};

export type UploadTenderResponse = {
  id: string;
  upload_id: string;
  tender_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_bucket: string;
  storage_path: string;
  pdf_url?: string | null;
  created_at: string;
  status: string;
  message: string;
};
