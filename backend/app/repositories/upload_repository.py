from typing import Any
from uuid import UUID

from app.db.supabase_client import get_supabase_client
from app.schemas.upload import UploadResponse

TENDER_PDF_STORAGE_BUCKET = "tender-pdfs"


class UploadRepository:
    def __init__(self, supabase_client: Any | None = None) -> None:
        self._supabase_client = (
            supabase_client if supabase_client is not None else get_supabase_client()
        )

    def upload_pdf(
        self,
        storage_path: str,
        file_bytes: bytes,
        mime_type: str,
    ) -> None:
        client = self._require_supabase_client()

        try:
            response = (
                client.storage.from_(TENDER_PDF_STORAGE_BUCKET).upload(
                    path=storage_path,
                    file=file_bytes,
                    file_options={
                        "content-type": mime_type,
                        "cache-control": "3600",
                        "upsert": "false",
                    },
                )
            )
            error = getattr(response, "error", None)
            if error:
                raise RuntimeError(
                    f"Failed to upload PDF to Supabase Storage: {error}"
                )
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError(
                "Failed to upload PDF to Supabase Storage. Verify the tender-pdfs "
                "bucket exists and backend Supabase credentials can write to it."
            ) from exc

    def create_upload_metadata(
        self,
        tender_id: UUID,
        user_id: UUID,
        file_name: str,
        file_size: int,
        mime_type: str,
        storage_path: str,
        pdf_url: str | None = None,
    ) -> UploadResponse:
        client = self._require_supabase_client()

        rows = self._query_uploads(
            "create upload metadata",
            client.table("uploads")
            .insert(
                {
                    "tender_id": str(tender_id),
                    "user_id": str(user_id),
                    "file_name": file_name,
                    "file_size": file_size,
                    "mime_type": mime_type,
                    "storage_bucket": TENDER_PDF_STORAGE_BUCKET,
                    "storage_path": storage_path,
                    "pdf_url": pdf_url,
                }
            )
            .select(
                "id,tender_id,user_id,file_name,file_size,mime_type,"
                "storage_bucket,storage_path,pdf_url,created_at"
            ),
        )
        if not rows:
            raise RuntimeError("Supabase did not return the created uploads row.")

        return self._row_to_upload_response(rows[0])

    def delete_pdf(self, storage_path: str) -> None:
        if self._supabase_client is None:
            return

        try:
            self._supabase_client.storage.from_(TENDER_PDF_STORAGE_BUCKET).remove(
                [storage_path]
            )
        except Exception:
            return

    def _require_supabase_client(self) -> Any:
        if self._supabase_client is None:
            raise RuntimeError("Supabase configuration is required for PDF upload.")

        return self._supabase_client

    def _query_uploads(self, action: str, query: Any) -> list[dict[str, Any]]:
        try:
            response = query.execute()
            error = getattr(response, "error", None)
            if error:
                raise RuntimeError(
                    f"Failed to {action} from Supabase public.uploads: {error}"
                )

            data = getattr(response, "data", None)
            if data is None:
                return []

            if not isinstance(data, list):
                raise RuntimeError(
                    f"Supabase returned an unexpected response for {action}: expected a list."
                )

            return data
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError(
                f"Failed to {action} from Supabase public.uploads. "
                "Verify Supabase credentials, table schema, and network access."
            ) from exc

    @staticmethod
    def _row_to_upload_response(row: dict[str, Any]) -> UploadResponse:
        upload_id = row["id"]
        return UploadResponse(
            id=upload_id,
            upload_id=upload_id,
            tender_id=row["tender_id"],
            file_name=row["file_name"],
            file_size=row["file_size"],
            mime_type=row["mime_type"],
            storage_bucket=row["storage_bucket"],
            storage_path=row["storage_path"],
            pdf_url=row.get("pdf_url"),
            created_at=row["created_at"],
            status="uploaded",
            message="PDF uploaded successfully. Extract text before running AI analysis.",
        )
