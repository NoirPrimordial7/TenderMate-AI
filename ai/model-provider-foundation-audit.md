# Model Provider Foundation Audit

## Architecture

`TenderAnalysisService` now owns tender/user validation, extraction readiness, quota checks, prompt construction, provider selection, shared JSON/Pydantic validation, one repair attempt, fallback, persistence, model-run telemetry, success-only credit consumption, and sampled shadow execution. The existing `POST /api/v1/tenders/{id}/analyze` request and response contract is unchanged.

Providers implement the typed `TenderModelProvider` protocol through `analyze_tender`, `answer_question`, and `healthcheck`. `GeminiTenderProvider` remains the default. `OpenAICompatibleTenderProvider` targets a backend-only OpenAI chat-completions endpoint suitable for a future Modal/vLLM deployment. Legacy Gemini service/response imports remain compatibility aliases.

All analysis output follows one validation path: remove a single allowed JSON code fence, parse a JSON object, validate `TenderAnalysisPayload`, attempt one controlled repair, then fail without saving invalid JSON or consuming credit. A different configured fallback provider is tried after the selected provider fails.

## Operating modes

- Gemini default: `AI_PROVIDER=gemini` and `AI_FALLBACK_PROVIDER=gemini`. Existing Gemini credentials and model settings continue to apply.
- Self-hosted endpoint: set the selected provider to `openai_compatible` and supply the backend-only base URL, API key, analysis model, assistant model, and timeout. A future Modal/vLLM OpenAI-compatible `/chat/completions` endpoint can be supplied through these variables without frontend changes.
- Fallback: choose a different `AI_FALLBACK_PROVIDER`. The fallback receives one logical generation attempt only after the primary path fails; a duplicate fallback is skipped when both names match.
- Shadow: set `AI_SHADOW_PROVIDER` and a sample rate from `0` to `1`. The default blank provider/rate `0` disables shadow mode. Sampled shadow results are never returned, never persisted as tender analysis, never consume credit, and cannot break the primary response.

## Observability and privacy

`ai_model_runs` stores provider/model identifiers, version tags, status, latency, nullable token counts, validation state, shadow state, safe error category, and a deterministic SHA-256 input hash. It does not store full prompts, API keys, auth tokens, signed PDF URLs, chain-of-thought, or raw tender text.

Shadow and fallback executions create separate run metadata. Observability storage is best-effort so a telemetry outage cannot turn a valid analysis into a user-facing failure. API keys remain in backend environment variables and are never returned, logged, or exposed through `NEXT_PUBLIC_*` variables.

## Feedback and training-data controls

Authenticated clients can submit field-level feedback with `POST /api/v1/tenders/{id}/feedback`. The service verifies tender ownership and, when provided, verifies that the model run belongs to the same user and tender. Supported types are `correct`, `incorrect`, `missing`, `wrong_source`, `unclear`, and `hallucinated`.

Training examples have no ordinary-user RLS policies or API route. Repository writes and review updates require an explicit backend/admin context. Database constraints require approved examples to have consent, anonymisation, and an expected output before they can be treated as approved data. This phase does not export datasets, train a model, store PDFs in Git, or deploy an endpoint.

## Database migration

Apply `database/migrations/20260717_add_ai_model_foundation.sql` after the base schema. It idempotently creates `ai_model_runs`, `ai_training_examples`, and `ai_output_feedback`, plus checks, indexes, timestamps, and RLS policies. User RLS is limited to viewing owned run metadata and creating/viewing feedback on owned tenders. Training-example access remains service-role/backend-admin only.

## Known limitations

- Ask TenderMate was not present on the committed `master` snapshot. Providers expose `answer_question`, but no new assistant orchestration or route is introduced in this phase.
- Shadow execution is synchronous in the current service process. Failures are isolated, but sampled requests include shadow latency until a durable background job system is added.
- Model-run telemetry intentionally stores no model output. Future offline comparison must create consented, anonymised, reviewed training examples through an admin workflow.
- Provider health checks validate configuration only; active endpoint probing can be added with deployment monitoring later.
- Database migration execution against a hosted Supabase project is an operational deployment step and is not performed by this repository change.
