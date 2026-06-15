from typing import Any
from uuid import UUID

from app.db.supabase_client import get_supabase_client

USER_COLUMNS = "id,full_name,email,password_hash,role,is_active,created_at,updated_at"


class AuthRepository:
    def __init__(self, supabase_client: Any | None = None) -> None:
        self._supabase_client = (
            supabase_client if supabase_client is not None else get_supabase_client()
        )
        if self._supabase_client is None:
            raise RuntimeError("Authentication requires Supabase configuration.")

    def find_user_by_email(self, email: str) -> dict[str, Any] | None:
        rows = self._query_users(
            f"find user by email {email}",
            self._supabase_client.table("app_users")
            .select(USER_COLUMNS)
            .eq("email", email)
            .limit(1),
        )
        return rows[0] if rows else None

    def find_user_by_id(self, user_id: UUID) -> dict[str, Any] | None:
        rows = self._query_users(
            f"find user by id {user_id}",
            self._supabase_client.table("app_users")
            .select(USER_COLUMNS)
            .eq("id", str(user_id))
            .limit(1),
        )
        return rows[0] if rows else None

    def create_user(
        self,
        full_name: str,
        email: str,
        password_hash: str,
    ) -> dict[str, Any]:
        rows = self._query_users(
            f"create user {email}",
            self._supabase_client.table("app_users").insert(
                {
                    "full_name": full_name,
                    "email": email,
                    "password_hash": password_hash,
                }
            ),
        )
        if not rows:
            raise RuntimeError("Supabase did not return the created app_users row.")

        return rows[0]

    def _query_users(self, action: str, query: Any) -> list[dict[str, Any]]:
        try:
            response = query.execute()
            error = getattr(response, "error", None)
            if error:
                raise RuntimeError(
                    f"Failed to {action} from Supabase public.app_users: {error}"
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
                f"Failed to {action} from Supabase public.app_users. "
                "Verify Supabase credentials, table schema, and network access."
            ) from exc
