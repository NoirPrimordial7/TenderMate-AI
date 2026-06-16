from dataclasses import dataclass
from functools import lru_cache
from os import getenv


def _load_dotenv_if_available() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return

    load_dotenv()


def _get_int_env(name: str, default: int) -> int:
    value = getenv(name)
    if value is None:
        return default

    try:
        return int(value)
    except ValueError:
        return default


def _get_bool_env(name: str, default: bool) -> bool:
    value = getenv(name)
    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


def _split_csv_env(value: str) -> list[str]:
    return [
        item.strip()
        for item in value.split(",")
        if item.strip() and item.strip() != "*"
    ]


@dataclass(frozen=True)
class Settings:
    project_name: str
    api_v1_prefix: str
    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str
    frontend_url: str
    cors_origins_env: str
    jwt_secret_key: str
    jwt_algorithm: str
    access_token_expire_minutes: int
    rate_limit_enabled: bool
    max_uploads_per_day: int
    max_ai_analyses_per_day: int
    gemini_api_key: str
    gemini_model: str
    free_analysis_credits_default: int
    max_gemini_input_chars: int
    gemini_request_timeout_seconds: int
    failed_login_lock_threshold: int
    failed_login_lock_minutes: int

    @property
    def cors_origins(self) -> list[str]:
        origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            self.frontend_url,
            *_split_csv_env(self.cors_origins_env),
        ]
        return list(dict.fromkeys(origin.rstrip("/") for origin in origins if origin))

    @property
    def has_supabase_config(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


@lru_cache
def get_settings() -> Settings:
    _load_dotenv_if_available()

    return Settings(
        project_name=getenv("PROJECT_NAME", "TenderMate AI Backend"),
        api_v1_prefix=getenv("API_V1_PREFIX", "/api/v1"),
        supabase_url=getenv("SUPABASE_URL", ""),
        supabase_service_role_key=getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        supabase_anon_key=getenv("SUPABASE_ANON_KEY", ""),
        frontend_url=getenv("FRONTEND_URL", "http://localhost:3000"),
        cors_origins_env=getenv("CORS_ORIGINS", ""),
        jwt_secret_key=getenv("JWT_SECRET_KEY", ""),
        jwt_algorithm=getenv("JWT_ALGORITHM", "HS256"),
        access_token_expire_minutes=_get_int_env("ACCESS_TOKEN_EXPIRE_MINUTES", 60),
        rate_limit_enabled=_get_bool_env("RATE_LIMIT_ENABLED", True),
        max_uploads_per_day=_get_int_env("MAX_UPLOADS_PER_DAY", 5),
        max_ai_analyses_per_day=_get_int_env("MAX_AI_ANALYSES_PER_DAY", 3),
        gemini_api_key=getenv("GEMINI_API_KEY", ""),
        gemini_model=getenv("GEMINI_MODEL", "gemini-3.1-flash-lite"),
        free_analysis_credits_default=_get_int_env(
            "FREE_ANALYSIS_CREDITS_DEFAULT",
            15,
        ),
        max_gemini_input_chars=_get_int_env("MAX_GEMINI_INPUT_CHARS", 100000),
        gemini_request_timeout_seconds=_get_int_env(
            "GEMINI_REQUEST_TIMEOUT_SECONDS",
            60,
        ),
        failed_login_lock_threshold=_get_int_env("FAILED_LOGIN_LOCK_THRESHOLD", 5),
        failed_login_lock_minutes=_get_int_env("FAILED_LOGIN_LOCK_MINUTES", 15),
    )
