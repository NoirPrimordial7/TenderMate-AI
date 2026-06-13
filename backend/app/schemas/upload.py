from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UploadResponse(BaseModel):
    id: UUID
    tender_id: UUID
    file_name: str
    file_size: int | None = None
    mime_type: str | None = None
    storage_bucket: str | None = None
    storage_path: str | None = None
    pdf_url: str | None = None
    created_at: datetime
    status: str
    message: str
