import json
import re
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from app.repositories.gemini_analysis_repository import GeminiAnalysisRepository


@dataclass(frozen=True)
class RetrievedTenderChunk:
    page: int
    text: str
    score: float
    extraction_method: str | None = None


class TenderRetriever:
    def __init__(self, page_repository: GeminiAnalysisRepository | None = None) -> None:
        self._page_repository = page_repository or GeminiAnalysisRepository()

    def retrieve(
        self,
        tender_id: UUID,
        user_id: UUID,
        question: str,
        *,
        analysis_json: dict[str, Any] | None = None,
        limit: int = 8,
    ) -> list[RetrievedTenderChunk]:
        pages = self._page_repository.list_tender_pages(tender_id=tender_id, user_id=user_id)
        terms = self._expanded_terms(question)
        hinted_pages = self._analysis_page_hints(analysis_json or {}, terms)
        candidates: list[RetrievedTenderChunk] = []
        for page in pages:
            page_number = int(page.get("page_number") or 0)
            page_text = str(page.get("text") or "").strip()
            if page_number < 1 or not page_text:
                continue
            for chunk in self._chunks(page_text):
                normalized = self._normalize(chunk)
                term_score = sum(min(normalized.count(term), 4) for term in terms if term)
                exact_bonus = 5 if self._normalize(question) in normalized else 0
                source_bonus = 4 if page_number in hinted_pages else 0
                candidates.append(
                    RetrievedTenderChunk(
                        page=page_number,
                        text=chunk,
                        score=float(term_score + exact_bonus + source_bonus),
                        extraction_method=page.get("extraction_method"),
                    )
                )
        candidates.sort(key=lambda item: (-item.score, item.page))
        positive = [item for item in candidates if item.score > 0]
        return (positive or candidates)[: max(1, min(limit, 12))]

    @staticmethod
    def _chunks(text: str, size: int = 1400, overlap: int = 180) -> list[str]:
        normalized = "\n".join(line.strip() for line in text.splitlines() if line.strip())
        if len(normalized) <= size:
            return [normalized]
        chunks: list[str] = []
        start = 0
        while start < len(normalized):
            end = min(len(normalized), start + size)
            if end < len(normalized):
                boundary = max(normalized.rfind("\n", start, end), normalized.rfind(". ", start, end))
                if boundary > start + size // 2:
                    end = boundary + 1
            chunks.append(normalized[start:end].strip())
            if end >= len(normalized):
                break
            start = max(start + 1, end - overlap)
        return [chunk for chunk in chunks if chunk]

    @classmethod
    def _expanded_terms(cls, question: str) -> set[str]:
        terms = {term for term in re.findall(r"\w+", cls._normalize(question)) if len(term) > 1}
        expansions = {
            "eligibility": {"eligible", "qualification", "पात्रता", "योग्यता"},
            "eligible": {"eligibility", "qualification"},
            "documents": {"document", "certificate", "दस्तावेज", "कागदपत्र"},
            "emd": {"earnest money", "bid security", "deposit"},
            "deadline": {"submission", "date", "अंतिम", "मुदत"},
            "risk": {"disqualify", "penalty", "जोखिम", "जोखीम"},
            "turnover": {"financial", "revenue", "टर्नओवर"},
        }
        for term in list(terms):
            terms.update(expansions.get(term, set()))
        return terms

    @classmethod
    def _analysis_page_hints(cls, analysis: dict[str, Any], terms: set[str]) -> set[int]:
        pages: set[int] = set()

        def visit(value: Any) -> None:
            if isinstance(value, dict):
                source = value.get("source")
                searchable = cls._normalize(json.dumps(value, ensure_ascii=False, default=str))
                if isinstance(source, dict) and any(term in searchable for term in terms):
                    page = source.get("page")
                    if isinstance(page, int) and page > 0:
                        pages.add(page)
                for child in value.values():
                    visit(child)
            elif isinstance(value, list):
                for child in value:
                    visit(child)

        visit(analysis)
        return pages

    @staticmethod
    def _normalize(value: str) -> str:
        return re.sub(r"\s+", " ", value.casefold()).strip()
