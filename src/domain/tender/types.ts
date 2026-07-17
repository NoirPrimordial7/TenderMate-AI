export type RiskLevel = "Low" | "Medium" | "High";
export type RequirementStatus = "Ready" | "Missing" | "Not Verified";
export type RequirementPriority = "Required" | "Optional";
export type BeforeApplyStatus = "ready" | "warning" | "missing";
export type ExtractionMethod = "text" | "gemini_ocr" | "mixed";

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
  schemaVersion?: string;
  language?: string;
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
  uploadDateRaw: string;
  updatedDate: string;
  updatedAt: string;
  deadline: string;
  deadlineRaw?: string | null;
  status: "Uploaded" | "Extracted" | "Failed" | "Analyzed";
  riskLevel: RiskLevel;
  fitScore: number;
  category: string;
  recommendation?: string | null;
  missingDocuments?: number | null;
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
  extractedTextPreview?: string | null;
  pageCount?: number | null;
  schemaVersion?: string;
  extractionMethod?: ExtractionMethod | null;
  ocrUsed?: boolean;
  ocrConfidence?: number | null;
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

export type PDFExtractionResponse = {
  tender_id: string;
  status: string;
  page_count: number;
  pages_with_text: number;
  extraction_method: ExtractionMethod;
  ocr_used: boolean;
  message: string;
};

export type TenderSourceResponse = {
  tender_id: string;
  file_name: string;
  signed_url: string;
  expires_in: number;
};

export type GeminiAnalysisResponse = {
  tender_id: string;
  status: string;
  message: string;
};
