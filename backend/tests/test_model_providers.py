import unittest
from types import SimpleNamespace

from app.services.model_provider import (
    ModelGenerationRequest,
    ProviderTimeout,
    ProviderUnavailable,
    TenderQuestionContextChunk,
    TenderQuestionGenerationRequest,
)
from app.services.model_providers.gemini import GeminiTenderProvider
from app.services.model_providers.openai_compatible import (
    OpenAICompatibleTenderProvider,
)


class FakeGenerateContentConfig:
    def __init__(self, **values):
        self.values = values


class FakeGeminiTypes:
    GenerateContentConfig = FakeGenerateContentConfig


class FakeGeminiModels:
    def __init__(self, text='{"schemaVersion":"2.0"}'):
        self.text = text

    def generate_content(self, **_values):
        return SimpleNamespace(
            text=self.text,
            response_id="gemini-request",
            usage_metadata=SimpleNamespace(
                prompt_token_count=12,
                candidates_token_count=7,
            ),
            candidates=[SimpleNamespace(finish_reason="STOP")],
        )


class FakeResponse:
    def __init__(self, body, status_code=200):
        self._body = body
        self.status_code = status_code
        self.headers = {"x-request-id": "header-request"}

    def json(self):
        return self._body


class FakeHTTPClient:
    def __init__(self, responses):
        self.responses = list(responses)
        self.requests = []

    def post(self, path, json):
        self.requests.append((path, json))
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


class ModelProviderTests(unittest.TestCase):
    def test_gemini_provider_success(self) -> None:
        settings = SimpleNamespace(
            gemini_api_key="secret",
            gemini_model="gemini-test",
            gemini_request_timeout_seconds=30,
        )
        provider = GeminiTenderProvider(settings=settings)
        provider._build_client = lambda: (  # type: ignore[method-assign]
            SimpleNamespace(models=FakeGeminiModels()),
            FakeGeminiTypes,
        )
        result = provider.analyze_tender(
            ModelGenerationRequest(prompt="analyze", task="tender_analysis", require_json=True)
        )
        self.assertEqual(result.provider, "gemini")
        self.assertEqual(result.model_name, "gemini-test")
        self.assertEqual(result.input_tokens, 12)
        self.assertEqual(result.output_tokens, 7)
        self.assertEqual(result.request_id, "gemini-request")

    def test_gemini_assistant_uses_shared_provider(self) -> None:
        settings = SimpleNamespace(
            gemini_api_key="secret",
            gemini_model="gemini-test",
            gemini_request_timeout_seconds=30,
            max_tender_question_context_chars=32000,
            max_tender_question_output_tokens=1200,
        )
        provider = GeminiTenderProvider(settings=settings)
        provider._build_client = lambda: (  # type: ignore[method-assign]
            SimpleNamespace(
                models=FakeGeminiModels(
                    '{"answer":"Required","not_found":false,"citations":[]}'
                )
            ),
            FakeGeminiTypes,
        )
        result = provider.answer_question(self._question_request())
        self.assertEqual(result.provider, "gemini")
        self.assertIn('"answer":"Required"', result.raw_text)

    def test_openai_compatible_provider_success(self) -> None:
        client = FakeHTTPClient(
            [
                FakeResponse(
                    {
                        "id": "request-1",
                        "choices": [
                            {
                                "message": {"content": '{"schemaVersion":"2.0"}'},
                                "finish_reason": "stop",
                            }
                        ],
                        "usage": {"prompt_tokens": 10, "completion_tokens": 5},
                    }
                )
            ]
        )
        settings = self._openai_settings()
        provider = OpenAICompatibleTenderProvider(
            settings=settings,
            client_factory=lambda **_kwargs: client,
        )
        result = provider.analyze_tender(
            ModelGenerationRequest(prompt="analyze", task="tender_analysis", require_json=True)
        )
        self.assertEqual(result.provider, "openai_compatible")
        self.assertEqual(result.model_name, "analysis-model")
        self.assertEqual(result.request_id, "request-1")
        self.assertEqual(result.finish_reason, "stop")
        self.assertEqual(
            client.requests[0][1]["response_format"], {"type": "json_object"}
        )

    def test_openai_compatible_assistant_uses_assistant_model(self) -> None:
        client = FakeHTTPClient(
            [
                FakeResponse(
                    {
                        "id": "assistant-request",
                        "choices": [
                            {
                                "message": {
                                    "content": '{"answer":"Required","not_found":false,"citations":[]}'
                                },
                                "finish_reason": "stop",
                            }
                        ],
                    }
                )
            ]
        )
        provider = OpenAICompatibleTenderProvider(
            settings=self._openai_settings(),
            client_factory=lambda **_kwargs: client,
        )
        result = provider.answer_question(self._question_request())
        self.assertEqual(result.model_name, "assistant-model")
        self.assertEqual(client.requests[0][1]["model"], "assistant-model")
        self.assertEqual(
            client.requests[0][1]["response_format"], {"type": "json_object"}
        )

    def test_assistant_falls_back_when_json_response_mode_is_unsupported(self) -> None:
        client = FakeHTTPClient(
            [
                FakeResponse({}, status_code=400),
                FakeResponse(
                    {
                        "choices": [
                            {
                                "message": {
                                    "content": '{"answer":"Required","not_found":false,"citations":[]}'
                                },
                                "finish_reason": "stop",
                            }
                        ]
                    }
                ),
            ]
        )
        provider = OpenAICompatibleTenderProvider(
            settings=self._openai_settings(),
            client_factory=lambda **_kwargs: client,
        )
        provider.answer_question(self._question_request())
        self.assertIn("response_format", client.requests[0][1])
        self.assertNotIn("response_format", client.requests[1][1])

    def test_malformed_openai_response_is_controlled(self) -> None:
        client = FakeHTTPClient([FakeResponse({"choices": []})])
        provider = OpenAICompatibleTenderProvider(
            settings=self._openai_settings(),
            client_factory=lambda **_kwargs: client,
        )
        with self.assertRaises(ProviderUnavailable):
            provider.answer_question(self._question_request())

    def test_bearer_authentication_header(self) -> None:
        captured = {}
        client = FakeHTTPClient([])
        provider = OpenAICompatibleTenderProvider(
            settings=self._openai_settings(),
            client_factory=lambda **kwargs: (captured.update(kwargs) or client),
        )
        provider._build_client()
        self.assertEqual(
            captured["headers"]["Authorization"], "Bearer backend-secret"
        )
        self.assertNotIn("Modal-Key", captured["headers"])

    def test_modal_proxy_authentication_headers(self) -> None:
        captured = {}
        client = FakeHTTPClient([])
        settings = self._openai_settings()
        settings.tendermate_model_auth_mode = "modal_proxy"
        settings.tendermate_model_api_key = ""
        provider = OpenAICompatibleTenderProvider(
            settings=settings,
            client_factory=lambda **kwargs: (captured.update(kwargs) or client),
        )
        provider._build_client()
        self.assertEqual(captured["headers"]["Modal-Key"], "modal-key")
        self.assertEqual(captured["headers"]["Modal-Secret"], "modal-secret")
        self.assertNotIn("Authorization", captured["headers"])

    def test_openai_compatible_provider_timeout_is_controlled(self) -> None:
        client = FakeHTTPClient([TimeoutError("timed out")])
        provider = OpenAICompatibleTenderProvider(
            settings=self._openai_settings(),
            client_factory=lambda **_kwargs: client,
        )
        with self.assertRaises(ProviderTimeout):
            provider.analyze_tender(
                ModelGenerationRequest(prompt="analyze", task="tender_analysis")
            )

    @staticmethod
    def _openai_settings():
        return SimpleNamespace(
            tendermate_model_base_url="https://model.internal/v1",
            tendermate_model_auth_mode="bearer",
            tendermate_model_api_key="backend-secret",
            tendermate_model_modal_key="modal-key",
            tendermate_model_modal_secret="modal-secret",
            tendermate_analysis_model="analysis-model",
            tendermate_assistant_model="assistant-model",
            tendermate_model_timeout_seconds=120,
            max_tender_question_context_chars=32000,
            max_tender_question_output_tokens=1200,
        )

    @staticmethod
    def _question_request():
        return TenderQuestionGenerationRequest(
            question="What is required?",
            language="en",
            chunks=(
                TenderQuestionContextChunk(
                    page=1,
                    text="GST registration is required.",
                    extraction_method="text",
                ),
            ),
            structured_analysis={},
            conversation_history=(),
            response_schema={"type": "object"},
            task_metadata={"task": "tender_question"},
        )


if __name__ == "__main__":
    unittest.main()
