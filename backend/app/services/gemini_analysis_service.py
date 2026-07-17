"""Compatibility imports for callers using the previous Gemini-specific service."""

from app.services.tender_analysis_service import (
    ANALYSIS_FAILED_MESSAGE,
    ANALYSIS_NOT_CONFIGURED_MESSAGE,
    ANALYSIS_NOT_READY_MESSAGE,
    DAILY_QUOTA_EXCEEDED_MESSAGE,
    NO_EXTRACTED_TEXT_MESSAGE,
    NON_TENDER_DOCUMENT_MESSAGE,
    AnalysisNotConfiguredError,
    AnalysisNotReadyError,
    AnalysisQuotaExceededError,
    NoExtractedTextError,
    NonTenderDocumentError,
    TenderAnalysisFailedError,
    TenderAnalysisService,
    TenderNotFoundError,
    get_tender_analysis_service,
)

GEMINI_NOT_CONFIGURED_MESSAGE = ANALYSIS_NOT_CONFIGURED_MESSAGE
GeminiNotConfiguredError = AnalysisNotConfiguredError
GeminiAnalysisFailedError = TenderAnalysisFailedError
GeminiAnalysisService = TenderAnalysisService
get_gemini_analysis_service = get_tender_analysis_service

__all__ = [
    "ANALYSIS_FAILED_MESSAGE",
    "ANALYSIS_NOT_READY_MESSAGE",
    "DAILY_QUOTA_EXCEEDED_MESSAGE",
    "GEMINI_NOT_CONFIGURED_MESSAGE",
    "NO_EXTRACTED_TEXT_MESSAGE",
    "NON_TENDER_DOCUMENT_MESSAGE",
    "AnalysisNotReadyError",
    "AnalysisQuotaExceededError",
    "GeminiAnalysisFailedError",
    "GeminiAnalysisService",
    "GeminiNotConfiguredError",
    "NoExtractedTextError",
    "NonTenderDocumentError",
    "TenderNotFoundError",
    "get_gemini_analysis_service",
]
