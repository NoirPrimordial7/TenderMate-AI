# Gemini Analysis Plan

## Environment Variables

Backend-only Gemini configuration:

- `GEMINI_API_KEY`: required for AI analysis. Never expose it to the frontend.
- `GEMINI_MODEL`: defaults to `gemini-3.1-flash-lite`.
- `MAX_GEMINI_INPUT_CHARS`: defaults to `100000`.
- `GEMINI_REQUEST_TIMEOUT_SECONDS`: defaults to `60`.
- `FREE_ANALYSIS_CREDITS_DEFAULT`: defaults to `15` for demo/testing new users.

## Prompt Strategy

The backend reads `public.tender_pages` for the current user's tender and formats the prompt as page-numbered text:

```text
[PAGE 1]
...

[PAGE 2]
...
```

The prompt asks Gemini to act as an MSME tender analysis assistant, avoid invented facts, move missing facts into `missingInformation`, and return strict JSON only.

## JSON Schema

The stored `tenders.analysis_json` remains frontend-compatible with:

- `snapshot`
- `decision`
- `scores`
- `beforeApply`
- `documents`
- `eligibility`
- `financials`
- `technical`
- `dates`
- `risks`
- `missingInformation`
- `departmentQuestions`
- `proposalDraft`

Important findings include source references:

```json
{
  "page": 1,
  "clause": "Eligibility",
  "title": "Tender eligibility",
  "text": "short quoted snippet"
}
```

## Credit Deduction Rule

The analysis service checks credits before calling Gemini, but deducts one free analysis credit only after:

1. Gemini returns valid JSON.
2. The JSON validates against the backend schema.
3. `tenders.analysis_json` is saved.
4. The tender is updated to `status = 'analyzed'`.

Failed Gemini calls, invalid JSON, quota failures, missing pages, and persistence failures do not intentionally deduct credits.

## Error Handling

- Missing or unauthorized tender: `404`.
- Tender not extracted or no extracted text: `400`.
- No free credits or active subscription: `402`.
- Endpoint or daily AI quota exceeded: `429`.
- Gemini not configured: `500` with `AI analysis is not configured on this server.`
- Gemini/provider/persistence failure: friendly `500`; the tender is marked `failed` with a safe `error_message`.

Raw provider errors, API keys, and stack traces must not be returned to the frontend.

## Source Reference Strategy

Page-wise storage is required so generated analysis can cite exact pages. The prompt requires each major document, eligibility, financial, technical, and risk item to include a page number and quoted snippet. Unsupported recommendations should be avoided; unclear facts belong in `missingInformation`.

## Cost And Rate-Limit Safety

- `MAX_GEMINI_INPUT_CHARS` bounds prompt size.
- `MAX_AI_ANALYSES_PER_DAY` limits daily analysis usage.
- The route has an hourly rate limit.
- Credits are consumed only after successful persistence.
- Audit logs record `run_gemini_analysis` and `gemini_analysis_failed` without raw PDF text or secrets.
