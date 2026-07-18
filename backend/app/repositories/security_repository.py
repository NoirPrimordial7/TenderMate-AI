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
                    "last_used_timestep": None,
                    "failed_attempts": 0,
                    "locked_until": None,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                on_conflict="user_id",
            ),
            "create MFA factor",
        )
        if not rows:
            raise RuntimeError("MFA factor was not saved.")
        return rows[0]

    def rotate_factor_secret(self, user_id: UUID, secret_ciphertext: str) -> None:
        self._execute(
            self._client.table("user_mfa_factors").update(
                {"secret_ciphertext": secret_ciphertext, "updated_at": datetime.now(timezone.utc).isoformat()}
            ).eq("user_id", str(user_id)),
            "rotate MFA factor encryption",
        )

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
            self._client.rpc(
                "replace_mfa_recovery_codes",
                {"target_user_id": str(user_id), "new_code_hashes": code_hashes},
            ),
            "replace recovery codes",
        )

    def disable_mfa(self, user_id: UUID, current_session_id: UUID) -> None:
        self._execute(
            self._client.rpc(
                "disable_user_mfa",
                {"target_user_id": str(user_id), "current_session_id": str(current_session_id)},
            ),
            "disable MFA",
        )

    def change_password(self, user_id: UUID, password_hash: str, current_session_id: UUID) -> None:
        self._execute(
            self._client.rpc(
                "change_user_password",
                {
                    "target_user_id": str(user_id),
                    "new_password_hash": password_hash,
                    "current_session_id": str(current_session_id),
                },
            ),
            "change password",
        )

    def complete_password_reset(self, user_id: UUID, password_hash: str) -> None:
        self._execute(
            self._client.rpc(
                "complete_user_password_reset",
                {"target_user_id": str(user_id), "new_password_hash": password_hash},
            ),
            "complete password reset",
        )

    def list_unused_recovery_codes(self, user_id: UUID) -> list[dict[str, Any]]:
        rows = self._execute(
            self._client.table("user_mfa_recovery_codes").select("id,code_hash,created_at,used_at").eq("user_id", str(user_id)),
            "read recovery codes",
        )
        return [row for row in rows if not row.get("used_at")]

    def claim_totp_timestep(self, user_id: UUID, timestep: int) -> bool:
        rows = self._execute(
            self._client.table("user_mfa_factors").update(
                {
                    "last_used_timestep": timestep,
                    "failed_attempts": 0,
                    "locked_until": None,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("user_id", str(user_id)).or_(
                f"last_used_timestep.is.null,last_used_timestep.lt.{timestep}"
            ),
            "claim MFA timestep",
        )
        return bool(rows)

    def record_mfa_failure(self, user_id: UUID, threshold: int, lock_minutes: int) -> dict[str, Any] | None:
        rows = self._execute(
            self._client.rpc(
                "record_mfa_failure",
                {"target_user_id": str(user_id), "failure_threshold": threshold, "lock_minutes": lock_minutes},
            ),
            "record MFA failure",
        )
        return rows[0] if rows else None

    def consume_recovery_code(self, code_id: UUID, user_id: UUID) -> bool:
        rows = self._execute(
            self._client.table("user_mfa_recovery_codes").update(
                {"used_at": datetime.now(timezone.utc).isoformat()}
            ).eq("id", str(code_id)).eq("user_id", str(user_id)).is_("used_at", "null"),
            "consume recovery code",
        )
        return bool(rows)

    def create_mfa_challenge(self, user_id: UUID, token_id_hash: str, expires_at: datetime) -> None:
        self._execute(
            self._client.table("mfa_login_challenges").insert(
                {"user_id": str(user_id), "token_id_hash": token_id_hash, "expires_at": expires_at.isoformat()}
            ),
            "create MFA login challenge",
        )

    def consume_mfa_challenge(self, user_id: UUID, token_id_hash: str) -> bool:
        now = datetime.now(timezone.utc)
        rows = self._execute(
            self._client.table("mfa_login_challenges").update(
                {"used_at": now.isoformat()}
            ).eq("user_id", str(user_id)).eq("token_id_hash", token_id_hash).is_(
                "used_at", "null"
            ).gt("expires_at", now.isoformat()),
            "consume MFA login challenge",
        )
        return bool(rows)

    def get_active_mfa_challenge(self, user_id: UUID, token_id_hash: str) -> dict[str, Any] | None:
        now = datetime.now(timezone.utc)
        rows = self._execute(
            self._client.table("mfa_login_challenges").select("id,user_id,expires_at,used_at").eq(
                "user_id", str(user_id)
            ).eq("token_id_hash", token_id_hash).is_("used_at", "null").gt(
                "expires_at", now.isoformat()
            ).limit(1),
            "read MFA login challenge",
        )
        return rows[0] if rows else None

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

    def mark_session_mfa_verified(self, session_id: UUID, user_id: UUID) -> None:
        self._execute(
            self._client.table("user_sessions").update(
                {"mfa_verified": True, "recent_auth_at": datetime.now(timezone.utc).isoformat()}
            ).eq("id", str(session_id)).eq("user_id", str(user_id)).is_("revoked_at", "null"),
            "mark session MFA verified",
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

    def consume_valid_reset_token(self, token_hash: str) -> dict[str, Any] | None:
        now = datetime.now(timezone.utc)
        rows = self._execute(
            self._client.table("password_reset_tokens").update(
                {"used_at": now.isoformat()}
            ).eq("token_hash", token_hash).is_("used_at", "null").gt("expires_at", now.isoformat()),
            "consume password reset token",
        )
        return rows[0] if rows else None

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
