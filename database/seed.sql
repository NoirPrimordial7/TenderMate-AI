insert into public.tenders (
  id,
  title,
  organization,
  category,
  location,
  deadline,
  risk_level,
  fit_score,
  status,
  analysis_json
) values
(
  '11111111-1111-1111-1111-111111111111',
  'Mock Municipal Office Furniture Tender',
  'Demo Municipal Corporation',
  'Office Supplies',
  'Pune, Maharashtra',
  '30 June 2026',
  'Medium',
  72,
  'uploaded',
  '{
    "id": "11111111-1111-1111-1111-111111111111",
    "snapshot": {
      "title": "Mock Municipal Office Furniture Tender",
      "tenderId": "TMAI/MOCK/2026/001",
      "organization": "Demo Municipal Corporation",
      "location": "Pune, Maharashtra",
      "category": "Office Supplies",
      "estimatedValue": "Rs 12 Lakh",
      "emdAmount": "Rs 24,000",
      "submissionDeadline": "30 June 2026",
      "contractDuration": "30 days"
    },
    "decision": {
      "shouldApply": "Review",
      "recommendation": "Placeholder analysis only. Full AI analysis will be added later.",
      "overallFitScore": 72,
      "riskLevel": "Medium",
      "deadlineUrgency": "Medium",
      "missingCriticalRequirements": 1
    },
    "scores": [
      { "label": "Overall Fit", "value": 72, "display": "72%" }
    ],
    "beforeApply": [
      { "label": "Verify eligibility criteria", "status": "warning" }
    ],
    "documents": [],
    "eligibility": [],
    "financials": [],
    "technical": [],
    "dates": [
      { "label": "Last Submission Date", "date": "30 June 2026", "status": "upcoming" }
    ],
    "risks": [],
    "missingInformation": ["Original PDF extraction has not been implemented yet."],
    "departmentQuestions": ["Can the department confirm delivery location and warranty terms?"],
    "proposalDraft": "This is a placeholder proposal draft for backend testing."
  }'::jsonb
),
(
  '22222222-2222-2222-2222-222222222222',
  'Mock Desktop Computer Procurement',
  'Demo Education Department',
  'IT Hardware',
  'Mumbai, Maharashtra',
  '05 July 2026',
  'Low',
  84,
  'uploaded',
  '{
    "id": "22222222-2222-2222-2222-222222222222",
    "snapshot": {
      "title": "Mock Desktop Computer Procurement",
      "tenderId": "TMAI/MOCK/2026/002",
      "organization": "Demo Education Department",
      "location": "Mumbai, Maharashtra",
      "category": "IT Hardware",
      "estimatedValue": "Rs 20 Lakh",
      "emdAmount": "Rs 40,000",
      "submissionDeadline": "05 July 2026",
      "contractDuration": "45 days"
    },
    "decision": {
      "shouldApply": "Yes",
      "recommendation": "Mock tender appears suitable pending document verification.",
      "overallFitScore": 84,
      "riskLevel": "Low",
      "deadlineUrgency": "Low",
      "missingCriticalRequirements": 0
    },
    "scores": [
      { "label": "Overall Fit", "value": 84, "display": "84%" }
    ],
    "beforeApply": [
      { "label": "Confirm OEM authorization", "status": "ready" }
    ],
    "documents": [],
    "eligibility": [],
    "financials": [],
    "technical": [],
    "dates": [
      { "label": "Last Submission Date", "date": "05 July 2026", "status": "upcoming" }
    ],
    "risks": [],
    "missingInformation": [],
    "departmentQuestions": [],
    "proposalDraft": "This is a placeholder proposal draft for backend testing."
  }'::jsonb
)
on conflict (id) do update set
  title = excluded.title,
  organization = excluded.organization,
  category = excluded.category,
  location = excluded.location,
  deadline = excluded.deadline,
  risk_level = excluded.risk_level,
  fit_score = excluded.fit_score,
  status = excluded.status,
  analysis_json = excluded.analysis_json;

insert into public.uploads (
  id,
  tender_id,
  file_name,
  file_size,
  mime_type,
  storage_bucket,
  storage_path,
  pdf_url
) values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'mock-office-furniture-tender.pdf',
  245760,
  'application/pdf',
  null,
  null,
  null
)
on conflict (id) do update set
  tender_id = excluded.tender_id,
  file_name = excluded.file_name,
  file_size = excluded.file_size,
  mime_type = excluded.mime_type,
  storage_bucket = excluded.storage_bucket,
  storage_path = excluded.storage_path,
  pdf_url = excluded.pdf_url;
