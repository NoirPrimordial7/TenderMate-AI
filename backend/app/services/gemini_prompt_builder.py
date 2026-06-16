from typing import Any


def build_gemini_analysis_prompt(
    pages: list[dict[str, Any]],
    max_input_chars: int,
) -> str:
    page_text = _build_page_text_block(pages, max_input_chars)

    return f"""You are an MSME tender analysis assistant for Indian small businesses.

Analyze the tender PDF text below and return strict JSON only. Do not return Markdown, code fences, commentary, or text outside JSON.

Rules:
- Do not invent facts.
- If a fact is missing or unclear, add it to missingInformation instead of guessing.
- Every document, eligibility, financial, technical, and risk item must include a source object.
- Each source object must include page, clause, title, and a short exact text snippet from the page.
- Use page numbers from the [PAGE n] markers.
- Keep quoted source text short and directly relevant.
- Use "Not specified" when a field is not available in the PDF.
- Decision should be Apply, Review, or Avoid.
- Score values must be integers from 0 to 100.
- Risk values must be Low, Medium, or High.

Required JSON shape:
{{
  "snapshot": {{
    "title": "string",
    "tenderId": "string",
    "organization": "string",
    "location": "string",
    "category": "string",
    "estimatedValue": "string",
    "emdAmount": "string",
    "submissionDeadline": "string",
    "contractDuration": "string"
  }},
  "decision": {{
    "shouldApply": "Apply|Review|Avoid",
    "recommendation": "string",
    "overallFitScore": 0,
    "riskLevel": "Low|Medium|High",
    "deadlineUrgency": "Low|Medium|High",
    "missingCriticalRequirements": 0
  }},
  "scores": [
    {{"label": "Overall Fit", "value": 0, "display": "0%"}}
  ],
  "beforeApply": [
    {{"label": "string", "status": "ready|warning|missing"}}
  ],
  "documents": [
    {{
      "name": "string",
      "priority": "Required|Optional",
      "status": "Ready|Missing|Not Verified",
      "source": {{"page": 1, "clause": "string", "title": "string", "text": "string"}}
    }}
  ],
  "eligibility": [
    {{
      "title": "string",
      "text": "string",
      "impact": "Low|Medium|High",
      "userStatus": "Ready|Missing|Not Verified",
      "source": {{"page": 1, "clause": "string", "title": "string", "text": "string"}}
    }}
  ],
  "financials": [
    {{
      "label": "string",
      "value": "string",
      "note": "string",
      "chartAmount": 0,
      "source": {{"page": 1, "clause": "string", "title": "string", "text": "string"}}
    }}
  ],
  "technical": [
    {{
      "requirement": "string",
      "source": {{"page": 1, "clause": "string", "title": "string", "text": "string"}}
    }}
  ],
  "dates": [
    {{"label": "string", "date": "string", "status": "done|upcoming|unknown"}}
  ],
  "risks": [
    {{
      "title": "string",
      "level": "Low|Medium|High",
      "explanation": "string",
      "source": {{"page": 1, "clause": "string", "title": "string", "text": "string"}}
    }}
  ],
  "missingInformation": ["string"],
  "departmentQuestions": ["string"],
  "proposalDraft": "string"
}}

Analyze for:
- Should this MSME apply?
- Required documents.
- Eligibility criteria.
- EMD, tender fees, turnover, security deposit, and other financial commitments.
- Important dates.
- Technical requirements.
- Risks and red flags.
- Missing information.
- Questions to ask the department.
- A simple proposal draft.
- Fit scores.

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
