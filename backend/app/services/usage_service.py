from typing import Any
from uuid import UUID

from app.db.supabase_client import get_supabase_client

ANALYSIS_COMPLETED_EVENT = "analysis_completed"

USER_BILLING_COLUMNS = "id,free_analysis_credits,plan_name,subscription_status"


class AnalysisLimitReachedError(Exception):
    pass


class UsageService:
    def __init__(self, supabase_client: Any | None = None) -> None:
        self._supabase_client = (
            supabase_client if supabase_client is not None else get_supabase_client()
        )
        if self._supabase_client is None:
            raise RuntimeError("Usage tracking requires Supabase configuration.")

    def get_user_usage_summary(self, user_id: UUID) -> dict[str, Any]:
        user = self._get_billing_user(user_id)
        total_events = self._count_usage_events(user_id)
        analysis_completed = self._count_usage_events(
            user_id,
            event_type=ANALYSIS_COMPLETED_EVENT,
        )

        return {
            "free_analysis_credits": user["free_analysis_credits"],
            "plan_name": user["plan_name"],
            "subscription_status": user["subscription_status"],
            "can_run_ai_analysis": self._has_analysis_access(user),
            "usage_counts": {
                "analysis_completed": analysis_completed,
                "total_events": total_events,
            },
        }

    def can_run_ai_analysis(self, user_id: UUID) -> bool:
        return self._has_analysis_access(self._get_billing_user(user_id))

    def record_usage_event(
        self,
        user_id: UUID,
        event_type: str,
        resource_id: UUID | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        rows = self._query_rows(
            "record usage event",
            self._supabase_client.table("user_usage_events").insert(
                {
                    "user_id": str(user_id),
                    "event_type": event_type,
                    "resource_id": str(resource_id) if resource_id else None,
                    "metadata": metadata,
                }
            ),
            table_name="user_usage_events",
        )
        if not rows:
            raise RuntimeError(
                "Supabase did not return the created user_usage_events row."
            )

        return rows[0]

    def consume_analysis_credit(
        self,
        user_id: UUID,
        tender_id: UUID,
    ) -> dict[str, Any]:
        user = self._get_billing_user(user_id)
        if not self._has_analysis_access(user):
            raise AnalysisLimitReachedError(
                "Free analysis limit reached. Please upgrade to continue."
            )

        if self._is_subscription_active(user):
            self.record_usage_event(
                user_id=user_id,
                event_type=ANALYSIS_COMPLETED_EVENT,
                resource_id=tender_id,
                metadata={
                    "free_credit_consumed": False,
                    "plan_name": user["plan_name"],
                    "subscription_status": user["subscription_status"],
                },
            )
            return user

        updated_user = self._deduct_free_credit(user_id)
        self.record_usage_event(
            user_id=user_id,
            event_type=ANALYSIS_COMPLETED_EVENT,
            resource_id=tender_id,
            metadata={
                "free_credit_consumed": True,
                "free_analysis_credits_remaining": updated_user[
                    "free_analysis_credits"
                ],
                "plan_name": updated_user["plan_name"],
                "subscription_status": updated_user["subscription_status"],
            },
        )
        return updated_user

    def _deduct_free_credit(self, user_id: UUID) -> dict[str, Any]:
        for _ in range(3):
            user = self._get_billing_user(user_id)
            current_credits = int(user["free_analysis_credits"])
            if current_credits <= 0:
                break

            rows = self._query_rows(
                "consume free analysis credit",
                self._supabase_client.table("app_users")
                .update({"free_analysis_credits": current_credits - 1})
                .eq("id", str(user_id))
                .eq("free_analysis_credits", current_credits),
                table_name="app_users",
            )
            if rows:
                return rows[0]

        latest_user = self._get_billing_user(user_id)
        if self._is_subscription_active(latest_user):
            return latest_user

        raise AnalysisLimitReachedError(
            "Free analysis limit reached. Please upgrade to continue."
        )

    def _get_billing_user(self, user_id: UUID) -> dict[str, Any]:
        rows = self._query_rows(
            f"load usage summary for user {user_id}",
            self._supabase_client.table("app_users")
            .select(USER_BILLING_COLUMNS)
            .eq("id", str(user_id))
            .limit(1),
            table_name="app_users",
        )
        if not rows:
            raise RuntimeError("User was not found in public.app_users.")

        return rows[0]

    def _count_usage_events(self, user_id: UUID, event_type: str | None = None) -> int:
        query = (
            self._supabase_client.table("user_usage_events")
            .select("id", count="exact")
            .eq("user_id", str(user_id))
        )
        if event_type is not None:
            query = query.eq("event_type", event_type)

        response = self._execute_query(
            "count usage events",
            query,
            table_name="user_usage_events",
        )
        count = getattr(response, "count", None)
        if isinstance(count, int):
            return count

        data = getattr(response, "data", None)
        return len(data) if isinstance(data, list) else 0

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
    def _has_analysis_access(user: dict[str, Any]) -> bool:
        return (
            int(user.get("free_analysis_credits") or 0) > 0
            or UsageService._is_subscription_active(user)
        )

    @staticmethod
    def _is_subscription_active(user: dict[str, Any]) -> bool:
        return str(user.get("subscription_status", "")).lower() == "active"

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


def get_usage_service() -> UsageService:
    return UsageService()
