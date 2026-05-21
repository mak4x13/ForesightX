from datetime import datetime, timezone
from time import monotonic
from typing import Optional


START_TIME = monotonic()
REQUESTS_SERVED = 0
LAST_ERROR_TIMESTAMP: Optional[str] = None


def increment_requests() -> int:
    global REQUESTS_SERVED
    REQUESTS_SERVED += 1
    return REQUESTS_SERVED


def mark_error() -> str:
    global LAST_ERROR_TIMESTAMP
    LAST_ERROR_TIMESTAMP = datetime.now(timezone.utc).isoformat()
    return LAST_ERROR_TIMESTAMP


def health_snapshot() -> dict:
    return {
        "uptime_seconds": round(monotonic() - START_TIME, 2),
        "requests_served": REQUESTS_SERVED,
        "last_error_timestamp": LAST_ERROR_TIMESTAMP,
    }
