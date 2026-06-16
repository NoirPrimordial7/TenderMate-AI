from uuid import UUID

from pydantic import BaseModel


class PDFExtractionResponse(BaseModel):
    tender_id: UUID
    status: str
    page_count: int
    pages_with_text: int
    extraction_method: str
    ocr_used: bool
    message: str
