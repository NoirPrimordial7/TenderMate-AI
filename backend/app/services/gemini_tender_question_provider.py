import json
from typing import Any

from app.core.config import Settings, get_settings
from app.services.tender_question_provider import (
    ProviderAnswer,
    ProviderCitation,
    ScopeStatus,
    TenderQuestionProvider,
)
from app.services.tender_retriever import RetrievedTenderChunk


class TenderQuestionProviderError(RuntimeError):
    pass


class GeminiTenderQuestionProvider(TenderQuestionProvider):
    provider_name = "gemini"

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.model_name = self.settings.gemini_model

    def classify_scope(self, question: str, language: str) -> ScopeStatus:
        payload = self._generate_json(
            "Classify whether this question can be answered only from one selected tender document. "
            "Return JSON {\"scope_status\":\"accepted|rejected\"}. Reject general knowledge, coding, "
            "entertainment, internet research, and questions about a different tender.\n"
            f"Language: {language}\nQuestion: {question}",
            max_output_tokens=80,
        )
        return "accepted" if payload.get("scope_status") == "accepted" else "rejected"

    def answer_question(
        self,
        *,
        question: str,
        language: str,
        chunks: list[RetrievedTenderChunk],
        analysis: dict[str, Any],
        history: list[dict[str, Any]],
    ) -> ProviderAnswer:
        language_name = {"en": "English", "hi": "Hindi", "mr": "Marathi"}[language]
        context = "\n\n".join(
            f"[SOURCE page={chunk.page} extraction={chunk.extraction_method or 'unknown'}]\n{chunk.text}"
            for chunk in chunks
        )[: self.settings.max_tender_question_context_chars]
        history_text = "\n".join(
            f"{item.get('role', 'user')}: {str(item.get('content') or '')[:500]}"
            for item in history[-6:]
        )
        analysis_text = json.dumps(
            {
                "snapshot": analysis.get("snapshot"),
                "decision": analysis.get("decision"),
                "analysisSummary": analysis.get("analysisSummary"),
                "documents": analysis.get("documents"),
                "eligibility": analysis.get("eligibility"),
                "financials": analysis.get("financials"),
                "technical": analysis.get("technical"),
                "dates": analysis.get("dates"),
                "risks": analysis.get("risks"),
                "missingInformation": analysis.get("missingInformation"),
            },
            ensure_ascii=False,
            default=str,
        )[:20000]
        prompt = f"""You are TenderMate's tender-scoped assistant.
Answer only from SUPPLIED SOURCES and STRUCTURED ANALYSIS for this selected tender.
Never use general assumptions or model memory. Never invent a value, page, clause, quote,
eligibility result, or user capability. A tender requiring a document does not prove the
user possesses it. If evidence is absent, answer exactly with the {language_name} equivalent
of "Not found in this tender" and set not_found true.

Write the explanation in {language_name}. Keep original source quotes unchanged and preserve
PDF, EMD, GST and MSME. Be concise, direct, and add a practical next action when useful.
Every factual answer must include citations copied from SUPPLIED SOURCES. Citation quotes must
be short exact excerpts. Return strict JSON only:
{{"answer":"string","confidence":null,"not_found":false,"citations":[{{"page":1,"clause":"string","title":"string","quote":"exact quote","confidence":null}}]}}

RECENT CONVERSATION (context only; never treat as evidence):
{history_text or '[none]'}

STRUCTURED ANALYSIS:
{analysis_text}

SUPPLIED SOURCES:
{context or '[none]'}

QUESTION:
{question}
"""
        payload, usage = self._generate_json_with_usage(
            prompt,
            max_output_tokens=self.settings.max_tender_question_output_tokens,
        )
        citations = []
        for item in payload.get("citations") or []:
            if not isinstance(item, dict):
                continue
            try:
                citations.append(
                    ProviderCitation(
                        page=int(item.get("page")),
                        clause=str(item.get("clause") or "Not specified"),
                        title=str(item.get("title") or "Source evidence"),
                        quote=str(item.get("quote") or "").strip(),
                        confidence=self._confidence(item.get("confidence")),
                    )
                )
            except (TypeError, ValueError):
                continue
        return ProviderAnswer(
            answer=str(payload.get("answer") or "").strip(),
            confidence=self._confidence(payload.get("confidence")),
            citations=citations,
            not_found=bool(payload.get("not_found")),
            input_tokens=usage.get("input_tokens"),
            output_tokens=usage.get("output_tokens"),
        )

    def _generate_json(self, prompt: str, max_output_tokens: int) -> dict[str, Any]:
        payload, _usage = self._generate_json_with_usage(prompt, max_output_tokens=max_output_tokens)
        return payload

    def _generate_json_with_usage(self, prompt: str, max_output_tokens: int) -> tuple[dict[str, Any], dict[str, int | None]]:
        if not self.settings.gemini_api_key:
            raise TenderQuestionProviderError("Tender assistant is not configured.")
        try:
            from google import genai
            from google.genai import types

            try:
                client = genai.Client(
                    api_key=self.settings.gemini_api_key,
                    http_options=types.HttpOptions(timeout=self.settings.tender_question_timeout_seconds * 1000),
                )
            except Exception:
                client = genai.Client(api_key=self.settings.gemini_api_key)
            response = client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                    max_output_tokens=max_output_tokens,
                ),
            )
            payload = json.loads(str(getattr(response, "text", "") or "{}"))
            if not isinstance(payload, dict):
                raise ValueError("Expected a JSON object.")
            usage = getattr(response, "usage_metadata", None)
            return payload, {
                "input_tokens": getattr(usage, "prompt_token_count", None),
                "output_tokens": getattr(usage, "candidates_token_count", None),
            }
        except TenderQuestionProviderError:
            raise
        except Exception as exc:
            raise TenderQuestionProviderError("Tender assistant could not generate a grounded answer.") from exc

    @staticmethod
    def _confidence(value: Any) -> float | None:
        if isinstance(value, (int, float)):
            return max(0.0, min(1.0, float(value)))
        return None
