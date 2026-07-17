export type RiskLevel = "Low" | "Medium" | "High";
export type RequirementStatus = "Ready" | "Missing" | "Not Verified";
export type RequirementPriority = "Required" | "Optional";
export type BeforeApplyStatus = "ready" | "warning" | "missing";
export type ExtractionMethod = "text" | "gemini_ocr" | "mixed";
export type DocumentType = "tender" | "non_tender" | "uncertain";
export type DocumentValidationStatus = "valid" | "invalid" | "review" | "pending";
export type TechnicalCategory = "Scope of work" | "Specifications" | "Experience" | "Personnel" | "Equipment" | "Certifications" | "Delivery and installation" | "Quality and acceptance" | "Other";

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
  positiveFactors?: string[];
  blockers?: string[];
  uncertainties?: string[];
  explanation?: string;
};

export type SourceReference = {
  page: number;
  clause: string;
  title: string;
  text: string;
  confidence?: number | null;
  extractionMethod?: "text" | "ocr" | "mixed" | null;
  blockId?: string | null;
};

export type DocumentRequirement = {
  name: string;
  priority: RequirementPriority;
  status: RequirementStatus;
  source: SourceReference;
  reason?: string;
  preparationAction?: string;
  userVerified?: boolean | null;
};

export type EligibilityRequirement = {
  title: string;
  text: string;
  impact: RiskLevel;
  userStatus: RequirementStatus;
  source: SourceReference;
  mandatory?: boolean | null;
  verificationReason?: string;
  confidence?: number | null;
};

export type RiskItem = {
  title: string;
  level: RiskLevel;
  explanation: string;
  source: SourceReference;
  likelihood?: RiskLevel | null;
  consequence?: string;
  mitigation?: string;
  confidence?: number | null;
};

export type TechnicalRequirement = {
  requirement: string;
  source: SourceReference;
  category?: TechnicalCategory | string;
  mandatory?: boolean | null;
  acceptanceCriteria?: string;
  explanation?: string;
  userStatus?: RequirementStatus;
};

export type DateItem = {
  label: string;
  date: string;
  status?: "done" | "upcoming" | "unknown";
  isoDate?: string | null;
  source?: SourceReference | null;
  urgency?: RiskLevel | "Unknown";
};

export type FinancialItem = {
  label: string;
  value: string;
  note?: string;
  chartAmount?: number;
  source: SourceReference;
  type?: string;
  currency?: string;
  normalizedAmount?: number | null;
  refundable?: boolean | null;
  mandatory?: boolean | null;
};

export type ScoreItem = {
  key?: string;
  label: string;
  value: number;
  display: string;
  explanation?: string;
  sourceCount?: number;
};

export type AnalysisSummary = {
  executiveSummary?: string;
  strongestReasonToApply?: string;
  strongestReasonNotToApply?: string;
  nextBestAction?: string;
};

export type ReadinessScores = {
  eligibilityScore?: number | null;
  documentsScore?: number | null;
  financialScore?: number | null;
  technicalScore?: number | null;
  timelineScore?: number | null;
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
  analysisSummary?: AnalysisSummary;
  readiness?: ReadinessScores;
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
  status: "Uploaded" | "Extracted" | "Failed" | "Analyzed" | "Invalid" | "Validating";
  riskLevel: RiskLevel;
  fitScore: number;
  category: string;
  recommendation?: string | null;
  missingDocuments?: number | null;
  documentType?: DocumentType | null;
  documentValidationStatus?: DocumentValidationStatus | null;
  documentValidationConfidence?: number | null;
  documentValidationReason?: string | null;
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
  documentType?: DocumentType | null;
  documentValidationStatus?: DocumentValidationStatus | null;
  documentValidationConfidence?: number | null;
  documentValidationReason?: string | null;
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
