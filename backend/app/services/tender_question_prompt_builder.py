from __future__ import annotations

import json

from app.services.model_provider import (
    ModelGenerationRequest,
    TenderQuestionGenerationRequest,
)


def build_tender_question_prompt(
    request: TenderQuestionGenerationRequest,
    *,
    max_context_chars: int,
    max_output_tokens: int,
) -> ModelGenerationRequest:
    language_name = {"en": "English", "hi": "Hindi", "mr": "Marathi"}[
        request.language
    ]
    context = "\n\n".join(
        f"[SOURCE page={chunk.page} extraction={chunk.extraction_method or 'unknown'}]\n{chunk.text}"
        for chunk in request.chunks
    )[:max_context_chars]
    history_text = "\n".join(
        f"{item.get('role', 'user')}: {item.get('content', '')[:500]}"
        for item in request.conversation_history[-6:]
    )
    analysis = request.structured_analysis
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
    response_schema = json.dumps(
        request.response_schema, ensure_ascii=False, separators=(",", ":")
    )
    prompt = f"""You are TenderMate's tender-scoped assistant.
Answer only from SUPPLIED SOURCES and STRUCTURED ANALYSIS for this selected tender.
Never use general assumptions or model memory. Never invent a value, page, clause, quote,
eligibility result, or user capability. A tender requiring a document does not prove the
user possesses it. If evidence is absent, answer with the {language_name} equivalent of
"Not found in this tender" and set not_found true.

Write the explanation in {language_name}. Keep original source quotes unchanged and preserve
PDF, EMD, GST and MSME. Be concise, direct, and add a practical next action when useful.
Every factual answer must include citations copied from SUPPLIED SOURCES. Citation quotes must
be short exact excerpts. Return strict JSON only matching this schema:
{response_schema}

RECENT CONVERSATION (context only; never treat as evidence):
{history_text or '[none]'}

STRUCTURED ANALYSIS:
{analysis_text}

SUPPLIED SOURCES:
{context or '[none]'}

QUESTION:
{request.question}
"""
    return ModelGenerationRequest(
        prompt=prompt,
        task="tender_question",
        require_json=True,
        temperature=0.1,
        max_output_tokens=max_output_tokens,
        metadata=request.task_metadata,
    )
