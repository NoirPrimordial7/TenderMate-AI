from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UploadResponse(BaseModel):
    id: UUID
    upload_id: UUID
    tender_id: UUID
    file_name: str
    file_size: int
    mime_type: str
    storage_bucket: str
    storage_path: str
    pdf_url: str | None = None
    created_at: datetime
    status: str
    message: str
