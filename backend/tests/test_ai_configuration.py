import os
import unittest
from unittest.mock import patch

from app.core.config import get_settings


class AIConfigurationTests(unittest.TestCase):
    def tearDown(self) -> None:
        get_settings.cache_clear()

    def test_default_provider_configuration_is_gemini(self) -> None:
        with patch.dict(
            os.environ,
            {
                "AI_PROVIDER": "gemini",
                "AI_FALLBACK_PROVIDER": "gemini",
                "AI_SHADOW_PROVIDER": "",
                "AI_SHADOW_SAMPLE_RATE": "0",
            },
        ):
            get_settings.cache_clear()
            settings = get_settings()
            self.assertEqual(settings.ai_provider, "gemini")
            self.assertEqual(settings.ai_fallback_provider, "gemini")

    def test_rejects_unsupported_provider(self) -> None:
        with patch.dict(os.environ, {"AI_PROVIDER": "unsupported"}):
            get_settings.cache_clear()
            with self.assertRaises(ValueError):
                get_settings()

    def test_rejects_shadow_sample_rate_outside_range(self) -> None:
        with patch.dict(os.environ, {"AI_SHADOW_SAMPLE_RATE": "1.1"}):
            get_settings.cache_clear()
            with self.assertRaises(ValueError):
                get_settings()

    def test_self_hosted_selection_requires_endpoint_settings(self) -> None:
        with patch.dict(
            os.environ,
            {
                "AI_PROVIDER": "openai_compatible",
                "TENDERMATE_MODEL_BASE_URL": "",
                "TENDERMATE_MODEL_API_KEY": "",
                "TENDERMATE_MODEL_AUTH_MODE": "bearer",
                "TENDERMATE_ANALYSIS_MODEL": "",
                "TENDERMATE_ASSISTANT_MODEL": "",
            },
        ):
            get_settings.cache_clear()
            with self.assertRaises(ValueError):
                get_settings()

    def test_modal_proxy_requires_key_and_secret(self) -> None:
        with patch.dict(
            os.environ,
            {
                "AI_PROVIDER": "openai_compatible",
                "TENDERMATE_MODEL_BASE_URL": "https://model.example/v1",
                "TENDERMATE_MODEL_AUTH_MODE": "modal_proxy",
                "TENDERMATE_MODEL_MODAL_KEY": "",
                "TENDERMATE_MODEL_MODAL_SECRET": "",
                "TENDERMATE_ANALYSIS_MODEL": "analysis",
                "TENDERMATE_ASSISTANT_MODEL": "assistant",
            },
        ):
            get_settings.cache_clear()
            with self.assertRaises(ValueError):
                get_settings()

    def test_shadow_allowlist_rejects_invalid_uuid(self) -> None:
        with patch.dict(os.environ, {"AI_SHADOW_USER_ALLOWLIST": "not-a-uuid"}):
            get_settings.cache_clear()
            with self.assertRaises(ValueError):
                get_settings()


if __name__ == "__main__":
    unittest.main()
