# Tender-scoped assistant audit

## Baseline

- Branch `feat/tender-scoped-assistant` matches current `master` at `d39b3a1`; frontend lint/build and 7 backend tests pass.
- The approved decision workspace already owns tab state and an accessible private-PDF source drawer. `AskTenderMateReport` is a disabled placeholder and receives neither the tender nor the existing `onSource` callback.
- Authenticated tender reads and extracted page reads are already scoped by both `tender_id` and `user_id`. Signed source URLs are generated separately and are not stored in analysis data.

## Missing capability

- No question API, schemas, conversation repository, retrieval service, provider abstraction, citation validator, assistant-specific limits, or chat persistence exists.
- `tender_pages` contains page number, text, extraction method, tender ID, and user ID; it is sufficient for deterministic lexical retrieval without a vector database.
- Analysis schema v1/v2 can supply source-page hints and structured decision context, but any cited quote still needs validation against retrieved page text.
- The existing in-memory limiter supports fixed windows but has no concurrent-request guard or persisted daily assistant count.
- Logout already clears all SWR keys prefixed `private`; assistant requests must use that namespace and AbortController cancellation.

## Implementation boundaries

- Add user/tender-scoped `tender_chat_messages` storage with RLS and idempotent migration.
- Reject obvious off-topic questions before model use; retrieve bounded chunks from only the selected tender; abstract the provider behind `TenderQuestionProvider`.
- Validate every citation against retrieved pages. If no valid evidence remains, return `not_found` instead of an unsupported factual answer.
- Store only questions/answers and validated citation metadata—not prompts, signed URLs, raw PDFs, or full page context. Assistant questions do not consume analysis credits.
- Replace only the Ask tab and connect its citations to the existing source drawer. Add all interface copy in English, Hindi, and Marathi.
