import argparse
import sys
from datetime import datetime, timezone

from app.core.config import get_settings
from app.db.supabase_client import get_supabase_client

ROLES = ("super_admin", "admin", "support", "finance", "reviewer")


def grant_staff_role(email: str, role: str) -> int:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        print("Backend SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.", file=sys.stderr)
        return 2
    client = get_supabase_client(settings)
    normalized = email.strip().lower()
    response = client.table("app_users").select("id,email,role,email_verified_at").eq("email", normalized).limit(1).execute()
    rows = list(getattr(response, "data", None) or [])
    if not rows:
        print("Target account does not exist.", file=sys.stderr)
        return 3
    target = rows[0]
    if not target.get("email_verified_at"):
        print("Target account must have a verified email.", file=sys.stderr)
        return 4
    if target.get("role") == role:
        print(f"No change: {normalized} already has role {role}.")
        return 0
    client.table("app_users").update({"role": role}).eq("id", target["id"]).execute()
    client.table("app_sessions").update({"revoked_at": datetime.now(timezone.utc).isoformat(), "revoked_reason": "staff bootstrap role change"}).eq("user_id", target["id"]).is_("revoked_at", "null").execute()
    client.table("admin_audit_events").insert({"actor_user_id": None, "actor_role": "system", "action": "staff_role_bootstrap", "target_type": "user", "target_id": target["id"], "reason": "server maintenance bootstrap", "metadata": {"new_role": role}}).execute()
    print(f"Granted {role} to verified account {normalized}; existing sessions were revoked.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Grant a NividaIQ staff role using backend service credentials.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--role", required=True, choices=ROLES)
    args = parser.parse_args()
    return grant_staff_role(args.email, args.role)


if __name__ == "__main__": raise SystemExit(main())
