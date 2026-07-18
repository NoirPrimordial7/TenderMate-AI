export const LEGAL_CONFIG = {
  entityName: process.env.LEGAL_ENTITY_NAME?.trim() || "Operator details pending before public launch",
  businessAddress: process.env.LEGAL_BUSINESS_ADDRESS?.trim() || "Business address pending before public launch",
  contactEmail: process.env.LEGAL_CONTACT_EMAIL?.trim() || "",
  grievanceOfficerName: process.env.LEGAL_GRIEVANCE_OFFICER_NAME?.trim() || "Grievance officer details pending",
  grievanceOfficerEmail: process.env.LEGAL_GRIEVANCE_OFFICER_EMAIL?.trim() || "",
  governingState: process.env.LEGAL_GOVERNING_STATE?.trim() || "Maharashtra",
  effectiveDate: process.env.LEGAL_EFFECTIVE_DATE?.trim() || "Pending legal review",
  version: process.env.LEGAL_VERSION?.trim() || "1.0"
} as const;
