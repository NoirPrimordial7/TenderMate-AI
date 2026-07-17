from dataclasses import dataclass
from functools import lru_cache
from os import getenv


SUPPORTED_AI_PROVIDERS = {"gemini", "openai_compatible"}


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


def _get_float_env(name: str, default: float) -> float:
    value = getenv(name)
    if value is None or not value.strip():
        return default
    try:
        return float(value)
    except ValueError as exc:
        raise ValueError(f"{name} must be a number.") from exc


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
    gemini_ocr_enabled: bool
    gemini_ocr_model: str
    ocr_min_text_threshold: int
    max_ocr_pdf_size_mb: int
    ocr_max_pages: int
    gemini_ocr_timeout_seconds: int
    free_analysis_credits_default: int
    max_model_input_chars: int
    gemini_request_timeout_seconds: int
    ai_provider: str
    ai_fallback_provider: str
    ai_shadow_provider: str
    ai_shadow_sample_rate: float
    tendermate_model_base_url: str
    tendermate_model_api_key: str
    tendermate_analysis_model: str
    tendermate_assistant_model: str
    tendermate_model_timeout_seconds: int
    failed_login_lock_threshold: int
    failed_login_lock_minutes: int

    def __post_init__(self) -> None:
        selected = {
            "AI_PROVIDER": self.ai_provider,
            "AI_FALLBACK_PROVIDER": self.ai_fallback_provider,
        }
        if self.ai_shadow_provider:
            selected["AI_SHADOW_PROVIDER"] = self.ai_shadow_provider
        for setting_name, provider_name in selected.items():
            if provider_name not in SUPPORTED_AI_PROVIDERS:
                supported = ", ".join(sorted(SUPPORTED_AI_PROVIDERS))
                raise ValueError(
                    f"{setting_name} must be one of: {supported}."
                )
        if not 0 <= self.ai_shadow_sample_rate <= 1:
            raise ValueError("AI_SHADOW_SAMPLE_RATE must be between 0 and 1.")
        if "openai_compatible" in selected.values():
            required = {
                "TENDERMATE_MODEL_BASE_URL": self.tendermate_model_base_url,
                "TENDERMATE_MODEL_API_KEY": self.tendermate_model_api_key,
                "TENDERMATE_ANALYSIS_MODEL": self.tendermate_analysis_model,
                "TENDERMATE_ASSISTANT_MODEL": self.tendermate_assistant_model,
            }
            missing = [name for name, value in required.items() if not value]
            if missing:
                raise ValueError(
                    "Self-hosted provider settings are incomplete: "
                    + ", ".join(missing)
                    + "."
                )
        if self.tendermate_model_timeout_seconds < 1:
            raise ValueError("TENDERMATE_MODEL_TIMEOUT_SECONDS must be at least 1.")

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
    gemini_model = getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")

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
        gemini_model=gemini_model,
        gemini_ocr_enabled=_get_bool_env("GEMINI_OCR_ENABLED", True),
        gemini_ocr_model=getenv(
            "GEMINI_OCR_MODEL",
            gemini_model or "gemini-3.1-flash-lite",
        ),
        ocr_min_text_threshold=_get_int_env("OCR_MIN_TEXT_THRESHOLD", 300),
        max_ocr_pdf_size_mb=_get_int_env("MAX_OCR_PDF_SIZE_MB", 20),
        ocr_max_pages=_get_int_env("OCR_MAX_PAGES", 30),
        gemini_ocr_timeout_seconds=_get_int_env(
            "GEMINI_OCR_TIMEOUT_SECONDS",
            90,
        ),
        free_analysis_credits_default=_get_int_env(
            "FREE_ANALYSIS_CREDITS_DEFAULT",
            15,
        ),
        max_model_input_chars=_get_int_env(
            "MAX_MODEL_INPUT_CHARS",
            _get_int_env("MAX_GEMINI_INPUT_CHARS", 100000),
        ),
        gemini_request_timeout_seconds=_get_int_env(
            "GEMINI_REQUEST_TIMEOUT_SECONDS",
            60,
        ),
        ai_provider=getenv("AI_PROVIDER", "gemini").strip().lower(),
        ai_fallback_provider=getenv("AI_FALLBACK_PROVIDER", "gemini").strip().lower(),
        ai_shadow_provider=getenv("AI_SHADOW_PROVIDER", "").strip().lower(),
        ai_shadow_sample_rate=_get_float_env("AI_SHADOW_SAMPLE_RATE", 0),
        tendermate_model_base_url=getenv("TENDERMATE_MODEL_BASE_URL", "").strip(),
        tendermate_model_api_key=getenv("TENDERMATE_MODEL_API_KEY", "").strip(),
        tendermate_analysis_model=getenv("TENDERMATE_ANALYSIS_MODEL", "").strip(),
        tendermate_assistant_model=getenv("TENDERMATE_ASSISTANT_MODEL", "").strip(),
        tendermate_model_timeout_seconds=_get_int_env(
            "TENDERMATE_MODEL_TIMEOUT_SECONDS",
            120,
        ),
        failed_login_lock_threshold=_get_int_env("FAILED_LOGIN_LOCK_THRESHOLD", 5),
        failed_login_lock_minutes=_get_int_env("FAILED_LOGIN_LOCK_MINUTES", 15),
    )
