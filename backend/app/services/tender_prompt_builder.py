from app.services.gemini_prompt_builder import build_gemini_analysis_prompt


def build_tender_analysis_prompt(
    pages: list[dict[str, object]], max_input_chars: int
) -> str:
    """Build the provider-neutral tender analysis prompt.

    The legacy builder remains as a compatibility import while existing prompt text and
    production behavior stay unchanged.
    """
    return build_gemini_analysis_prompt(pages, max_input_chars)
