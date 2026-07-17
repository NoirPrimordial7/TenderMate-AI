import re

ScopeStatus = str


class TenderScopeClassifier:
    _rejected = (
        r"\b(write|generate|debug|explain)\s+(python|javascript|java|code|essay)\b",
        r"\b(tell|make)\s+me\s+a\s+joke\b",
        r"\b(cricket|football|movie|recipe|weather|internet)\b",
        r"\banother\s+tender\b",
    )
    _accepted_terms = {
        "tender", "eligibility", "eligible", "document", "documents", "mandatory",
        "emd", "fee", "deadline", "date", "turnover", "financial", "technical",
        "risk", "disqualify", "submission", "bid", "bidder", "clause", "source",
        "recommend", "missing", "organisation", "organization", "value", "apply",
        "procurement", "requirement", "requirements", "pdf", "gst", "msme",
        "पात्रता", "कागदपत्रे", "दस्तावेज", "निविदा", "जोखीम", "जोखिम", "अंतिम",
        "मुदत", "शुल्क", "ईएमडी", "आवश्यकता", "बोली",
    }

    def classify(self, question: str) -> ScopeStatus:
        normalized = question.casefold()
        if any(re.search(pattern, normalized) for pattern in self._rejected):
            return "rejected"
        words = set(re.findall(r"\w+", normalized, flags=re.UNICODE))
        if words.intersection(self._accepted_terms):
            return "accepted"
        return "uncertain"


SCOPE_REJECTION = {
    "en": "I can only answer questions about this tender and its connected documents.",
    "hi": "मैं केवल इस निविदा और इससे जुड़े दस्तावेज़ों के बारे में प्रश्नों के उत्तर दे सकता हूँ।",
    "mr": "मी फक्त या निविदेबद्दल आणि तिच्याशी जोडलेल्या कागदपत्रांबद्दलच्या प्रश्नांची उत्तरे देऊ शकतो.",
}

NOT_FOUND = {
    "en": "Not found in this tender.",
    "hi": "यह जानकारी इस निविदा में नहीं मिली।",
    "mr": "ही माहिती या निविदेत आढळली नाही.",
}
