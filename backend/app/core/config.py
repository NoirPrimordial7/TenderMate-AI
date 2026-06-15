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


@dataclass(frozen=True)
class Settings:
    project_name: str
    api_v1_prefix: str
    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str
    frontend_url: str
    jwt_secret_key: str
    jwt_algorithm: str
    access_token_expire_minutes: int

    @property
    def cors_origins(self) -> list[str]:
        origins = [self.frontend_url, "http://127.0.0.1:3000"]
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
        jwt_secret_key=getenv("JWT_SECRET_KEY", ""),
        jwt_algorithm=getenv("JWT_ALGORITHM", "HS256"),
        access_token_expire_minutes=_get_int_env("ACCESS_TOKEN_EXPIRE_MINUTES", 60),
    )
