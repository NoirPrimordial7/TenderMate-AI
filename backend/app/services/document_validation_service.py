from dataclasses import dataclass
import re

DocumentType = str


@dataclass(frozen=True)
class DocumentValidationResult:
    document_type: DocumentType
    status: str
    confidence: float
    reason: str


POSITIVE_SIGNALS = {
    "notice inviting tender": 4,
    "tender notice": 4,
    "request for quotation": 4,
    "e-quotation": 3,
    "bid submission": 3,
    "emd": 2,
    "earnest money deposit": 3,
    "procurement": 2,
    "tender id": 3,
    "submission deadline": 3,
    "bidder": 2,
    "eligibility criteria": 3,
    "bid security": 3,
    "nit": 2,
}

NEGATIVE_SIGNALS = {
    "curriculum vitae": 5,
    "career objective": 4,
    "personal profile": 4,
    "work experience": 2,
    "education": 2,
    "internship resume": 5,
    "resume": 4,
}


class DocumentValidationService:
    def classify(self, text: str) -> DocumentValidationResult:
        normalized = self._normalize(text)
        positive = self._matched(normalized, POSITIVE_SIGNALS)
        negative = self._matched(normalized, NEGATIVE_SIGNALS)
        positive_score = sum(POSITIVE_SIGNALS[item] for item in positive)
        negative_score = sum(NEGATIVE_SIGNALS[item] for item in negative)

        if negative_score >= 5 and negative_score >= positive_score + 2:
            confidence = min(0.98, 0.62 + (negative_score - positive_score) * 0.04)
            return DocumentValidationResult(
                document_type="non_tender",
                status="invalid",
                confidence=round(confidence, 2),
                reason=self._reason("non-tender", negative, positive),
            )

        if positive_score >= 6 and len(positive) >= 2 and positive_score >= negative_score + 2:
            confidence = min(0.98, 0.58 + (positive_score - negative_score) * 0.035)
            return DocumentValidationResult(
                document_type="tender",
                status="valid",
                confidence=round(confidence, 2),
                reason=self._reason("tender", positive, negative),
            )

        confidence = 0.5 if normalized else 0.35
        return DocumentValidationResult(
            document_type="uncertain",
            status="review",
            confidence=confidence,
            reason=self._reason("uncertain", positive, negative),
        )

    @staticmethod
    def _normalize(text: str) -> str:
        return re.sub(r"\s+", " ", text.casefold()).strip()

    @staticmethod
    def _matched(text: str, signals: dict[str, int]) -> list[str]:
        return [signal for signal in signals if re.search(rf"(?<!\w){re.escape(signal)}(?!\w)", text)]

    @staticmethod
    def _reason(label: str, primary: list[str], secondary: list[str]) -> str:
        primary_text = ", ".join(primary[:4]) or "no strong signals"
        if label == "tender":
            return f"Tender indicators found: {primary_text}."
        if label == "non-tender":
            return f"Non-tender indicators found: {primary_text}."
        secondary_text = ", ".join(secondary[:2])
        suffix = f" Conflicting indicators: {secondary_text}." if secondary_text else ""
        return f"The document does not contain enough independent tender indicators.{suffix}"
