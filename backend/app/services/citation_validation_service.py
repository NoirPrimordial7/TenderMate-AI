import re
from difflib import SequenceMatcher

from app.schemas.questions import QuestionCitation
from app.services.tender_question_provider import ProviderCitation
from app.services.tender_retriever import RetrievedTenderChunk


class CitationValidationService:
    def validate(
        self,
        citations: list[ProviderCitation],
        chunks: list[RetrievedTenderChunk],
    ) -> list[QuestionCitation]:
        by_page: dict[int, list[RetrievedTenderChunk]] = {}
        for chunk in chunks:
            by_page.setdefault(chunk.page, []).append(chunk)
        valid: list[QuestionCitation] = []
        for citation in citations:
            quote = citation.quote.strip()
            page_chunks = by_page.get(citation.page, [])
            if len(quote) < 8 or not page_chunks:
                continue
            if not any(self._matches(quote, chunk.text) for chunk in page_chunks):
                continue
            valid.append(
                QuestionCitation(
                    page=citation.page,
                    clause=citation.clause,
                    title=citation.title,
                    quote=quote,
                    confidence=citation.confidence,
                    extraction_method=page_chunks[0].extraction_method,
                )
            )
        return valid

    @classmethod
    def _matches(cls, quote: str, source: str) -> bool:
        normalized_quote = cls._normalize(quote)
        normalized_source = cls._normalize(source)
        if normalized_quote in normalized_source:
            return True
        quote_words = normalized_quote.split()
        if len(quote_words) < 4:
            return False
        source_words = normalized_source.split()
        window_size = len(quote_words)
        for index in range(max(1, len(source_words) - window_size + 1)):
            candidate = " ".join(source_words[index:index + window_size])
            if SequenceMatcher(None, normalized_quote, candidate).ratio() >= 0.9:
                return True
        return False

    @staticmethod
    def _normalize(value: str) -> str:
        return re.sub(r"[^\w₹%./-]+", " ", value.casefold()).strip()
