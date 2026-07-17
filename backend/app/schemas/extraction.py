from uuid import UUID

from pydantic import BaseModel


class PDFExtractionResponse(BaseModel):
    tender_id: UUID
    status: str
    page_count: int
    pages_with_text: int
    message: str


class TenderSourceResponse(BaseModel):
    tender_id: UUID
    file_name: str
    signed_url: str
    expires_in: int
