from datetime import datetime, timezone
import logging
from typing import Any
from uuid import UUID

from app.db.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

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
    "preferred_language,"
    "preferred_analysis_language,"
    "mfa_enabled,"
    "email_verified_at,"
    "password_changed_at,"
    "failed_login_count,"
    "locked_until,"
    "last_login_at,"
    "created_at,"
    "updated_at"
)

LEGACY_USER_COLUMNS = USER_COLUMNS.replace(
    "preferred_language,preferred_analysis_language,",
    "",
).replace("mfa_enabled,email_verified_at,password_changed_at,", "")


class LanguagePreferencesSchemaUnavailableError(RuntimeError):
    """Raised when the optional language-preference migration is not applied yet."""


class AuthRepository:
    def __init__(self, supabase_client: Any | None = None) -> None:
        self._supabase_client = (
            supabase_client if supabase_client is not None else get_supabase_client()
        )
        if self._supabase_client is None:
            raise RuntimeError("Authentication requires Supabase configuration.")
        self._supports_language_preferences: bool | None = None

    def find_user_by_email(self, email: str) -> dict[str, Any] | None:
        rows = self._find_users_with_schema_fallback(
            action=f"find user by email {email}",
            field="email",
            value=email,
        )
        return rows[0] if rows else None

    def find_user_by_id(self, user_id: UUID) -> dict[str, Any] | None:
        rows = self._find_users_with_schema_fallback(
            action=f"find user by id {user_id}",
            field="id",
            value=str(user_id),
        )
        return rows[0] if rows else None

    def create_user(
        self,
        full_name: str,
        email: str,
        password_hash: str,
        free_analysis_credits: int,
        preferred_language: str = "en",
        preferred_analysis_language: str = "en",
    ) -> dict[str, Any]:
        values = {
            "full_name": full_name,
            "email": email,
            "password_hash": password_hash,
            "free_analysis_credits": free_analysis_credits,
            "plan_name": "free",
            "subscription_status": "trial",
        }
        if self._supports_language_preferences is not False:
            values.update(
                {
                    "preferred_language": preferred_language,
                    "preferred_analysis_language": preferred_analysis_language,
                }
            )
        try:
            rows = self._query_users(
                f"create user {email}",
                self._supabase_client.table("app_users").insert(values),
            )
        except LanguagePreferencesSchemaUnavailableError:
            self._use_legacy_language_schema()
            values.pop("preferred_language", None)
            values.pop("preferred_analysis_language", None)
            rows = self._query_users(
                f"create user {email} without language preferences",
                self._supabase_client.table("app_users").insert(values),
            )
        if not rows:
            raise RuntimeError("Supabase did not return the created app_users row.")

        return rows[0]

    def update_language_preferences(
        self,
        user_id: UUID,
        preferred_language: str | None = None,
        preferred_analysis_language: str | None = None,
    ) -> dict[str, Any]:
        values: dict[str, Any] = {}
        if preferred_language is not None:
            values["preferred_language"] = preferred_language
        if preferred_analysis_language is not None:
            values["preferred_analysis_language"] = preferred_analysis_language
        if not values:
            user = self.find_user_by_id(user_id)
            if user is None:
                raise RuntimeError("Supabase did not return the app_users row.")
            return user
        if self._supports_language_preferences is False:
            user = self.find_user_by_id(user_id)
            if user is None:
                raise RuntimeError("Supabase did not return the app_users row.")
            return user
        try:
            return self._update_user(
                user_id=user_id,
                values=values,
                action="update language preferences",
            )
        except LanguagePreferencesSchemaUnavailableError:
            self._use_legacy_language_schema()
            user = self.find_user_by_id(user_id)
            if user is None:
                raise RuntimeError("Supabase did not return the app_users row.")
            return user

    def _find_users_with_schema_fallback(
        self,
        action: str,
        field: str,
        value: str,
    ) -> list[dict[str, Any]]:
        columns = USER_COLUMNS if self._supports_language_preferences is not False else LEGACY_USER_COLUMNS
        try:
            rows = self._query_users(
                action,
                self._supabase_client.table("app_users")
                .select(columns)
                .eq(field, value)
                .limit(1),
            )
            if columns == USER_COLUMNS:
                self._supports_language_preferences = True
            return rows
        except LanguagePreferencesSchemaUnavailableError:
            self._use_legacy_language_schema()
            return self._query_users(
                f"{action} without language preferences",
                self._supabase_client.table("app_users")
                .select(LEGACY_USER_COLUMNS)
                .eq(field, value)
                .limit(1),
            )

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

    def update_password(self, user_id: UUID, password_hash: str) -> dict[str, Any]:
        return self._update_user(
            user_id=user_id,
            values={
                "password_hash": password_hash,
                "password_changed_at": datetime.now(timezone.utc).isoformat(),
                "failed_login_count": 0,
                "locked_until": None,
            },
            action="update password",
        )

    def set_mfa_enabled(self, user_id: UUID, enabled: bool) -> dict[str, Any]:
        return self._update_user(
            user_id=user_id,
            values={"mfa_enabled": enabled},
            action="update MFA status",
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

            return [self._with_language_defaults(row) for row in data]
        except RuntimeError:
            raise
        except Exception as exc:
            error_text = str(exc)
            if "42703" in error_text and (
                "preferred_language" in error_text
                or "preferred_analysis_language" in error_text
                or "mfa_enabled" in error_text
                or "password_changed_at" in error_text
                or "email_verified_at" in error_text
            ):
                raise LanguagePreferencesSchemaUnavailableError(
                    "Language preference columns are not available yet."
                ) from exc
            raise RuntimeError(
                f"Failed to {action} from Supabase public.app_users. "
                "Verify Supabase credentials, table schema, and network access."
            ) from exc

    @staticmethod
    def _with_language_defaults(user: dict[str, Any]) -> dict[str, Any]:
        normalized = dict(user)
        normalized.setdefault("preferred_language", "en")
        normalized.setdefault("preferred_analysis_language", "en")
        normalized.setdefault("mfa_enabled", False)
        normalized.setdefault("email_verified_at", None)
        normalized.setdefault("password_changed_at", None)
        return normalized

    def _use_legacy_language_schema(self) -> None:
        if self._supports_language_preferences is not False:
            logger.warning(
                "Supabase app_users language preference columns are missing; "
                "using the legacy auth schema until the language migration is applied."
            )
        self._supports_language_preferences = False
