from typing import Any
from uuid import UUID

from app.db.supabase_client import get_supabase_client

UPLOAD_COLUMNS = (
    "id,tender_id,user_id,file_name,file_size,mime_type,"
    "storage_bucket,storage_path,pdf_url,created_at"
)


class PDFExtractionRepository:
    def __init__(self, supabase_client: Any | None = None) -> None:
        self._supabase_client = (
            supabase_client if supabase_client is not None else get_supabase_client()
        )

    def get_latest_upload_for_tender(
        self,
        tender_id: UUID,
        user_id: UUID,
    ) -> dict[str, Any] | None:
        client = self._require_supabase_client()
        rows = self._query_rows(
            "load upload metadata",
            client.table("uploads")
            .select(UPLOAD_COLUMNS)
            .eq("tender_id", str(tender_id))
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .limit(1),
            table_name="uploads",
        )

        return rows[0] if rows else None

    def download_pdf(self, storage_bucket: str, storage_path: str) -> bytes:
        client = self._require_supabase_client()

        try:
            return client.storage.from_(storage_bucket).download(storage_path)
        except Exception as exc:
            raise RuntimeError(
                "Could not download the uploaded PDF from Supabase Storage."
            ) from exc

    def replace_tender_pages(
        self,
        tender_id: UUID,
        user_id: UUID,
        page_texts: list[str],
    ) -> None:
        client = self._require_supabase_client()

        self._execute_query(
            "delete old tender pages",
            client.table("tender_pages")
            .delete()
            .eq("tender_id", str(tender_id))
            .eq("user_id", str(user_id)),
            table_name="tender_pages",
        )

        if not page_texts:
            return

        rows = [
            {
                "tender_id": str(tender_id),
                "user_id": str(user_id),
                "page_number": index + 1,
                "text": text,
            }
            for index, text in enumerate(page_texts)
        ]
        self._execute_query(
            "insert tender pages",
            client.table("tender_pages").insert(rows),
            table_name="tender_pages",
        )

    def mark_tender_extracted(
        self,
        tender_id: UUID,
        user_id: UUID,
        page_count: int,
        extracted_text_preview: str | None,
    ) -> None:
        client = self._require_supabase_client()
        self._execute_query(
            "mark tender extracted",
            client.table("tenders")
            .update(
                {
                    "status": "extracted",
                    "page_count": page_count,
                    "extracted_text_preview": extracted_text_preview,
                    "error_message": None,
                }
            )
            .eq("id", str(tender_id))
            .eq("user_id", str(user_id)),
            table_name="tenders",
        )

    def mark_tender_failed(
        self,
        tender_id: UUID,
        user_id: UUID,
        error_message: str,
    ) -> None:
        if self._supabase_client is None:
            return

        self._execute_query(
            "mark tender extraction failed",
            self._supabase_client.table("tenders")
            .update({"status": "failed", "error_message": error_message})
            .eq("id", str(tender_id))
            .eq("user_id", str(user_id)),
            table_name="tenders",
        )

    def _require_supabase_client(self) -> Any:
        if self._supabase_client is None:
            raise RuntimeError("Supabase configuration is required for PDF extraction.")

        return self._supabase_client

    def _query_rows(
        self,
        action: str,
        query: Any,
        table_name: str,
    ) -> list[dict[str, Any]]:
        response = self._execute_query(action, query, table_name=table_name)
        data = getattr(response, "data", None)
        if data is None:
            return []

        if not isinstance(data, list):
            raise RuntimeError(
                f"Supabase returned an unexpected response for {action}: expected a list."
            )

        return data

    @staticmethod
    def _execute_query(action: str, query: Any, table_name: str) -> Any:
        try:
            response = query.execute()
            error = getattr(response, "error", None)
            if error:
                raise RuntimeError(
                    f"Failed to {action} from Supabase public.{table_name}: {error}"
                )

            return response
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError(
                f"Failed to {action} from Supabase public.{table_name}. "
                "Verify Supabase credentials, table schema, and network access."
            ) from exc
