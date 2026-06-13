from typing import Any

from app.core.config import Settings, get_settings


def get_supabase_client(settings: Settings | None = None) -> Any | None:
    active_settings = settings or get_settings()

    if not active_settings.has_supabase_config:
        return None

    try:
        from supabase import create_client
    except ImportError as exc:
        raise RuntimeError(
            "The supabase package is not installed. Install backend requirements first."
        ) from exc

    return create_client(
        active_settings.supabase_url,
        active_settings.supabase_service_role_key,
    )
