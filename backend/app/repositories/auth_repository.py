from typing import Any
from datetime import datetime
from uuid import UUID

from app.db.supabase_client import get_supabase_client

USER_COLUMNS = (
    "id,"
    "full_name,"
    "email,"
    "password_hash,"
    "role,"
    "is_active,"
    "free_analysis_credits,"
    "plan_name,"
    "subscription_status,"
    "failed_login_count,"
    "locked_until,"
    "last_login_at,"
    "created_at,"
    "updated_at"
)


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
                    "free_analysis_credits": 5,
                    "plan_name": "free",
                    "subscription_status": "trial",
                }
            ),
        )
        if not rows:
            raise RuntimeError("Supabase did not return the created app_users row.")

        return rows[0]

    def record_failed_login(
        self,
        user_id: UUID,
        failed_login_count: int,
        locked_until: datetime | None,
    ) -> dict[str, Any]:
        return self._update_user(
            user_id=user_id,
            values={
                "failed_login_count": failed_login_count,
                "locked_until": locked_until.isoformat() if locked_until else None,
            },
            action="record failed login",
        )

    def record_successful_login(self, user_id: UUID, last_login_at: datetime) -> dict[str, Any]:
        return self._update_user(
            user_id=user_id,
            values={
                "failed_login_count": 0,
                "locked_until": None,
                "last_login_at": last_login_at.isoformat(),
            },
            action="record successful login",
        )

    def _update_user(
        self,
        user_id: UUID,
        values: dict[str, Any],
        action: str,
    ) -> dict[str, Any]:
        rows = self._query_users(
            f"{action} for user {user_id}",
            self._supabase_client.table("app_users")
            .update(values)
            .eq("id", str(user_id)),
        )
        if rows:
            return rows[0]

        user = self.find_user_by_id(user_id)
        if user is None:
            raise RuntimeError("Supabase did not return the updated app_users row.")

        return user

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
