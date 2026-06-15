from collections import defaultdict, deque
from dataclasses import dataclass
from threading import Lock
from time import monotonic


class RateLimitExceededError(Exception):
    pass


@dataclass(frozen=True)
class RateLimitRule:
    name: str
    max_requests: int
    window_seconds: int


class InMemoryRateLimitStore:
    def __init__(self) -> None:
        self._requests: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def hit(self, key: str, rule: RateLimitRule) -> None:
        now = monotonic()
        window_start = now - rule.window_seconds

        with self._lock:
            timestamps = self._requests[key]
            while timestamps and timestamps[0] <= window_start:
                timestamps.popleft()

            if len(timestamps) >= rule.max_requests:
                raise RateLimitExceededError(
                    "Too many requests. Please try again later."
                )

            timestamps.append(now)


class RateLimitService:
    def __init__(self, store: InMemoryRateLimitStore | None = None) -> None:
        self._store = store or InMemoryRateLimitStore()

    def check(self, identifier: str, rule: RateLimitRule) -> None:
        self._store.hit(f"{rule.name}:{identifier}", rule)


_rate_limit_service = RateLimitService()


def get_rate_limit_service() -> RateLimitService:
    return _rate_limit_service
