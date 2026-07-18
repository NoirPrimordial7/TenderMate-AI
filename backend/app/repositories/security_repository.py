from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app.db.supabase_client import get_supabase_client


class SecurityRepository:
    def __init__(self, supabase_client: Any | None = None) -> None:
        self._client = supabase_client if supabase_client is not None else get_supabase_client()
        if self._client is None:
            raise RuntimeError("Account security requires Supabase configuration.")

    def get_factor(self, user_id: UUID) -> dict[str, Any] | None:
        rows = self._execute(
            self._client.table("user_mfa_factors").select("*").eq("user_id", str(user_id)).limit(1),
            "read MFA factor",
        )
        return rows[0] if rows else None

    def upsert_factor(self, user_id: UUID, secret_ciphertext: str) -> dict[str, Any]:
        rows = self._execute(
            self._client.table("user_mfa_factors").upsert(
                {
                    "user_id": str(user_id),
                    "secret_ciphertext": secret_ciphertext,
                    "verified_at": None,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                on_conflict="user_id",
            ),
            "create MFA factor",
        )
        if not rows:
            raise RuntimeError("MFA factor was not saved.")
        return rows[0]

    def confirm_factor(self, user_id: UUID) -> None:
        self._execute(
            self._client.table("user_mfa_factors").update(
                {"verified_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
            ).eq("user_id", str(user_id)),
            "confirm MFA factor",
        )

    def delete_factor(self, user_id: UUID) -> None:
        self._execute(
            self._client.table("user_mfa_factors").delete().eq("user_id", str(user_id)),
            "delete MFA factor",
        )

    def replace_recovery_codes(self, user_id: UUID, code_hashes: list[str]) -> None:
        self._execute(
            self._client.table("user_mfa_recovery_codes").delete().eq("user_id", str(user_id)),
            "delete recovery codes",
        )
        if code_hashes:
            self._execute(
                self._client.table("user_mfa_recovery_codes").insert(
                    [{"user_id": str(user_id), "code_hash": value} for value in code_hashes]
                ),
                "create recovery codes",
            )

    def list_unused_recovery_codes(self, user_id: UUID) -> list[dict[str, Any]]:
        rows = self._execute(
            self._client.table("user_mfa_recovery_codes").select("id,code_hash,created_at,used_at").eq("user_id", str(user_id)),
            "read recovery codes",
        )
        return [row for row in rows if not row.get("used_at")]

    def consume_recovery_code(self, code_id: UUID) -> None:
        self._execute(
            self._client.table("user_mfa_recovery_codes").update(
                {"used_at": datetime.now(timezone.utc).isoformat()}
            ).eq("id", str(code_id)),
            "consume recovery code",
        )

    def create_session(self, values: dict[str, Any]) -> dict[str, Any]:
        rows = self._execute(self._client.table("user_sessions").insert(values), "create session")
        if not rows:
            raise RuntimeError("User session was not saved.")
        return rows[0]

    def get_session(self, session_id: UUID, user_id: UUID) -> dict[str, Any] | None:
        rows = self._execute(
            self._client.table("user_sessions").select("*").eq("id", str(session_id)).eq("user_id", str(user_id)).limit(1),
            "read session",
        )
        return rows[0] if rows else None

    def list_sessions(self, user_id: UUID) -> list[dict[str, Any]]:
        return self._execute(
            self._client.table("user_sessions").select("*").eq("user_id", str(user_id)).order("last_seen_at", desc=True),
            "list sessions",
        )

    def touch_session(self, session_id: UUID, user_id: UUID) -> None:
        self._execute(
            self._client.table("user_sessions").update({"last_seen_at": datetime.now(timezone.utc).isoformat()}).eq("id", str(session_id)).eq("user_id", str(user_id)),
            "touch session",
        )

    def mark_recent_auth(self, session_id: UUID, user_id: UUID) -> None:
        self._execute(
            self._client.table("user_sessions").update({"recent_auth_at": datetime.now(timezone.utc).isoformat()}).eq("id", str(session_id)).eq("user_id", str(user_id)),
            "mark recent authentication",
        )

    def revoke_session(self, session_id: UUID, user_id: UUID) -> None:
        self._execute(
            self._client.table("user_sessions").update({"revoked_at": datetime.now(timezone.utc).isoformat()}).eq("id", str(session_id)).eq("user_id", str(user_id)),
            "revoke session",
        )

    def revoke_sessions(self, user_id: UUID, except_session_id: UUID | None = None) -> None:
        query = self._client.table("user_sessions").update({"revoked_at": datetime.now(timezone.utc).isoformat()}).eq("user_id", str(user_id))
        if except_session_id is not None:
            query = query.neq("id", str(except_session_id))
        self._execute(query, "revoke sessions")

    def record_event(self, values: dict[str, Any]) -> None:
        self._execute(self._client.table("account_security_events").insert(values), "record security event")

    def list_events(self, user_id: UUID, limit: int = 50) -> list[dict[str, Any]]:
        return self._execute(
            self._client.table("account_security_events").select("id,event_type,success,device,ip_hint,created_at").eq("user_id", str(user_id)).order("created_at", desc=True).limit(limit),
            "list security events",
        )

    def create_reset_token(self, values: dict[str, Any]) -> None:
        self._execute(self._client.table("password_reset_tokens").insert(values), "create password reset token")

    def invalidate_reset_tokens(self, user_id: UUID) -> None:
        self._execute(
            self._client.table("password_reset_tokens").update(
                {"used_at": datetime.now(timezone.utc).isoformat()}
            ).eq("user_id", str(user_id)).is_("used_at", "null"),
            "invalidate password reset tokens",
        )

    def find_reset_token(self, token_hash: str) -> dict[str, Any] | None:
        rows = self._execute(
            self._client.table("password_reset_tokens").select("*").eq("token_hash", token_hash).limit(1),
            "read password reset token",
        )
        return rows[0] if rows else None

    def consume_reset_token(self, token_id: UUID) -> None:
        self._execute(
            self._client.table("password_reset_tokens").update({"used_at": datetime.now(timezone.utc).isoformat()}).eq("id", str(token_id)),
            "consume password reset token",
        )

    def queue_notification(self, values: dict[str, Any]) -> None:
        self._execute(self._client.table("security_notification_outbox").insert(values), "queue security notification")

    @staticmethod
    def _execute(query: Any, action: str) -> list[dict[str, Any]]:
        try:
            response = query.execute()
            error = getattr(response, "error", None)
            if error:
                raise RuntimeError(f"Failed to {action}: {error}")
            data = getattr(response, "data", None)
            if data is None:
                return []
            if not isinstance(data, list):
                raise RuntimeError(f"Unexpected response while attempting to {action}.")
            return data
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError(f"Failed to {action} in the account-security store.") from exc
