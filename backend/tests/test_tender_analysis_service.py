import unittest
from types import SimpleNamespace
from uuid import uuid4

from app.services.model_provider import (
    ModelGenerationResult,
    ProviderUnavailable,
)
from app.services.tender_analysis_service import (
    TenderAnalysisFailedError,
    TenderAnalysisService,
)


class FakeTenderRepository:
    def __init__(self, tender=None):
        self.tender = tender or SimpleNamespace(
            document_type="tender",
            document_validation_status="valid",
            document_validation_reason=None,
            status="extracted",
        )

    def get_tender_by_id(self, tender_id, user_id):
        return self.tender


class FakeAnalysisRepository:
    def __init__(self):
        self.saved = None
        self.failed = False

    def list_tender_pages(self, tender_id, user_id):
        return [{"page_number": 1, "text": "Tender notice and requirements"}]

    def save_analysis(self, tender_id, user_id, analysis_json):
        self.saved = analysis_json

    def mark_analysis_failed(self, tender_id, user_id, error_message):
        self.failed = True


class FakeUsageService:
    def __init__(self):
        self.consumed = 0

    def can_run_ai_analysis(self, user_id):
        return True

    def count_usage_events(self, user_id, event_type, since_datetime):
        return 0

    def consume_analysis_credit(self, user_id, tender_id):
        self.consumed += 1


class FakeModelRepository:
    def __init__(self):
        self.runs = []

    def record_model_run(self, values):
        self.runs.append(values)
        return values


class SequenceProvider:
    def __init__(self, name, outputs):
        self.name = name
        self.outputs = list(outputs)
        self.calls = 0

    def analyze_tender(self, request):
        self.calls += 1
        output = self.outputs.pop(0)
        if isinstance(output, Exception):
            raise output
        return ModelGenerationResult(
            raw_text=output,
            parsed_json=None,
            provider=self.name,
            model_name=f"{self.name}-model",
            latency_ms=10,
            input_tokens=8,
            output_tokens=4,
        )

    def answer_question(self, request):
        return self.analyze_tender(request)

    def healthcheck(self):
        raise NotImplementedError


class TenderAnalysisServiceTests(unittest.TestCase):
    def test_invalid_json_then_repair_success(self) -> None:
        provider = SequenceProvider("gemini", ["not-json", "{}"])
        service, analysis_repo, usage, runs = self._service(provider)
        service.analyze_tender(uuid4(), uuid4(), usage)
        self.assertEqual(provider.calls, 2)
        self.assertIsNotNone(analysis_repo.saved)
        self.assertEqual(usage.consumed, 1)
        self.assertTrue(runs.runs[-1]["validation_passed"])

    def test_schema_invalid_then_repair_success(self) -> None:
        invalid = '{"decision":{"overallFitScore":101}}'
        provider = SequenceProvider("gemini", [invalid, "{}"])
        service, _analysis_repo, usage, _runs = self._service(provider)
        service.analyze_tender(uuid4(), uuid4(), usage)
        self.assertEqual(provider.calls, 2)
        self.assertEqual(usage.consumed, 1)

    def test_repair_failure_does_not_deduct_credit_or_persist(self) -> None:
        provider = SequenceProvider("gemini", ["bad", "still bad"])
        service, analysis_repo, usage, runs = self._service(provider)
        with self.assertRaises(TenderAnalysisFailedError):
            service.analyze_tender(uuid4(), uuid4(), usage)
        self.assertIsNone(analysis_repo.saved)
        self.assertEqual(usage.consumed, 0)
        self.assertEqual(runs.runs[-1]["status"], "invalid")

    def test_fallback_provider_success(self) -> None:
        primary = SequenceProvider("gemini", [ProviderUnavailable("down")])
        fallback = SequenceProvider("openai_compatible", ["{}"])
        service, analysis_repo, usage, runs = self._service(
            primary,
            fallback=fallback,
            fallback_name="openai_compatible",
        )
        service.analyze_tender(uuid4(), uuid4(), usage)
        self.assertIsNotNone(analysis_repo.saved)
        self.assertEqual(usage.consumed, 1)
        self.assertEqual([run["status"] for run in runs.runs], ["error", "success"])

    def test_shadow_execution_records_without_extra_credit(self) -> None:
        primary = SequenceProvider("gemini", ["{}"])
        shadow = SequenceProvider("openai_compatible", ["{}"])
        service, _analysis_repo, usage, runs = self._service(
            primary,
            shadow=shadow,
            shadow_rate=1,
        )
        service.analyze_tender(uuid4(), uuid4(), usage)
        self.assertEqual(shadow.calls, 1)
        self.assertEqual(usage.consumed, 1)
        self.assertEqual([run["is_shadow"] for run in runs.runs], [False, True])

    def test_shadow_failure_is_isolated(self) -> None:
        primary = SequenceProvider("gemini", ["{}"])
        shadow = SequenceProvider(
            "openai_compatible", [ProviderUnavailable("shadow down")]
        )
        service, analysis_repo, usage, runs = self._service(
            primary,
            shadow=shadow,
            shadow_rate=1,
        )
        service.analyze_tender(uuid4(), uuid4(), usage)
        self.assertIsNotNone(analysis_repo.saved)
        self.assertEqual(usage.consumed, 1)
        self.assertEqual(runs.runs[-1]["status"], "error")
        self.assertTrue(runs.runs[-1]["is_shadow"])

    def test_success_persists_run_and_deducts_credit_after_analysis_save(self) -> None:
        order = []
        provider = SequenceProvider("gemini", ["{}"])
        analysis_repo = FakeAnalysisRepository()
        usage = FakeUsageService()
        original_save = analysis_repo.save_analysis
        original_consume = usage.consume_analysis_credit
        analysis_repo.save_analysis = lambda *args, **kwargs: (order.append("save"), original_save(*args, **kwargs))[-1]
        usage.consume_analysis_credit = lambda *args, **kwargs: (order.append("credit"), original_consume(*args, **kwargs))[-1]
        service, _, _, runs = self._service(
            provider, analysis_repo=analysis_repo, usage=usage
        )
        service.analyze_tender(uuid4(), uuid4(), usage)
        self.assertEqual(order, ["save", "credit"])
        self.assertEqual(len(runs.runs), 1)
        self.assertRegex(runs.runs[0]["input_hash"], r"^[0-9a-f]{64}$")

    def _service(
        self,
        primary,
        *,
        fallback=None,
        fallback_name="gemini",
        shadow=None,
        shadow_rate=0,
        analysis_repo=None,
        usage=None,
    ):
        analysis_repo = analysis_repo or FakeAnalysisRepository()
        usage = usage or FakeUsageService()
        runs = FakeModelRepository()
        providers = {"gemini": primary}
        if fallback is not None:
            providers[fallback_name] = fallback
        if shadow is not None:
            providers["openai_compatible"] = shadow
        settings = SimpleNamespace(
            ai_provider="gemini",
            ai_fallback_provider=fallback_name,
            ai_shadow_provider="openai_compatible" if shadow else "",
            ai_shadow_sample_rate=shadow_rate,
            max_model_input_chars=100000,
            max_ai_analyses_per_day=3,
        )
        service = TenderAnalysisService(
            tender_repository=FakeTenderRepository(),
            analysis_repository=analysis_repo,
            model_repository=runs,
            settings=settings,
            providers=providers,
            sampler=lambda: 0,
        )
        return service, analysis_repo, usage, runs


if __name__ == "__main__":
    unittest.main()
