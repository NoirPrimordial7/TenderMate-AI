from typing import Any


def build_gemini_analysis_prompt(
    pages: list[dict[str, Any]],
    max_input_chars: int,
) -> str:
    page_text = _build_page_text_block(pages, max_input_chars)

    return f"""You are TenderMate, an MSME tender decision analyst for India.

Return strict JSON only for schema version 2.0. Never invent a fact, date, amount,
confidence, likelihood, or user capability. Use "Not specified" and add the gap to
missingInformation when the tender is silent. Explanations must be concise and plain.

The PDF describes requirements; it does not prove that the user satisfies them.
Therefore document status and eligibility userStatus MUST normally be "Not Verified".
Use "Ready" only when explicit user/company evidence is present in the supplied text.

Every requirement, money item, risk, and confident date must cite a short exact quote
using page markers. Source shape: page, clause, title, text, confidence (0..1 or null),
extractionMethod (text|ocr|mixed|null), blockId (null when unavailable).

Return this shape:
{{
  "schemaVersion":"2.0",
  "snapshot":{{"title":"string","tenderId":"string","organization":"string","location":"string","category":"string","estimatedValue":"string","emdAmount":"string","submissionDeadline":"string","contractDuration":"string"}},
  "decision":{{"shouldApply":"Apply|Review|Avoid","recommendation":"one sentence","overallFitScore":0,"riskLevel":"Low|Medium|High","deadlineUrgency":"Low|Medium|High","missingCriticalRequirements":0,"positiveFactors":["string"],"blockers":["string"],"uncertainties":["string"],"explanation":"string"}},
  "analysisSummary":{{"executiveSummary":"string","strongestReasonToApply":"string","strongestReasonNotToApply":"string","nextBestAction":"string"}},
  "readiness":{{"eligibilityScore":null,"documentsScore":null,"financialScore":null,"technicalScore":null,"timelineScore":null}},
  "scores":[{{"key":"eligibility|documents|financial|technical|timeline","label":"string","value":0,"display":"0%","explanation":"string","sourceCount":0}}],
  "beforeApply":[{{"label":"string","status":"ready|warning|missing"}}],
  "documents":[{{"name":"string","priority":"Required|Optional","status":"Not Verified","reason":"string","preparationAction":"string","userVerified":null,"source":{{"page":1,"clause":"string","title":"string","text":"string","confidence":null,"extractionMethod":null,"blockId":null}}}}],
  "eligibility":[{{"title":"string","text":"string","impact":"Low|Medium|High","userStatus":"Not Verified","mandatory":null,"verificationReason":"string","confidence":null,"source":{{"page":1,"clause":"string","title":"string","text":"string","confidence":null,"extractionMethod":null,"blockId":null}}}}],
  "financials":[{{"label":"string","value":"string","note":"string","chartAmount":null,"type":"EMD|Tender fee|Performance security|Turnover|Other","currency":"INR","normalizedAmount":null,"refundable":null,"mandatory":null,"source":{{"page":1,"clause":"string","title":"string","text":"string","confidence":null,"extractionMethod":null,"blockId":null}}}}],
  "technical":[{{"requirement":"string","category":"Scope of work|Specifications|Experience|Personnel|Equipment|Certifications|Delivery and installation|Quality and acceptance|Other","mandatory":null,"acceptanceCriteria":"string","explanation":"string","userStatus":"Not Verified","source":{{"page":1,"clause":"string","title":"string","text":"string","confidence":null,"extractionMethod":null,"blockId":null}}}}],
  "dates":[{{"label":"string","date":"original tender text","status":"done|upcoming|unknown","isoDate":null,"urgency":"Low|Medium|High|Unknown","source":null}}],
  "risks":[{{"title":"string","level":"Low|Medium|High","likelihood":null,"explanation":"string","consequence":"string","mitigation":"string","confidence":null,"source":{{"page":1,"clause":"string","title":"string","text":"string","confidence":null,"extractionMethod":null,"blockId":null}}}}],
  "missingInformation":["string"],"departmentQuestions":["string"],"proposalDraft":"string"
}}

Readiness values may be null. Only provide a 0-100 score when supported by enough
source-backed evidence; explain it and include sourceCount. Normalize INR amounts to
numeric rupees only when unambiguous. Use ISO 8601 dates only when confident. Do not
infer risk likelihood from severity. Categorise technical requirements and provide
consequence and mitigation for risks without claiming facts beyond the source.

PDF text:
{page_text}
"""


def _build_page_text_block(pages: list[dict[str, Any]], max_input_chars: int) -> str:
    max_chars = max(1, max_input_chars)
    chunks: list[str] = []
    used_chars = 0

    for page in pages:
        page_number = int(page.get("page_number") or 0)
        text = _normalize_text(str(page.get("text") or ""))
        if not text:
            continue

        header = f"[PAGE {page_number}]\n"
        remaining = max_chars - used_chars - len(header)
        if remaining <= 0:
            break

        was_truncated = len(text) > remaining
        if was_truncated:
            text = text[:remaining].rsplit(" ", 1)[0].strip()

        chunk = f"{header}{text}"
        if was_truncated:
            chunk = f"{chunk}\n[TRUNCATED]"

        chunks.append(chunk)
        used_chars += len(chunk) + 2

        if used_chars >= max_chars:
            break

    return "\n\n".join(chunks) if chunks else "[NO EXTRACTED TEXT]"


def _normalize_text(text: str) -> str:
    return "\n".join(line.strip() for line in text.splitlines() if line.strip())
