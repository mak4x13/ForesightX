from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException, Request

from app.core.config import settings
from app.core.limiter import limiter
from app.core.metrics import health_snapshot


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/health")
@limiter.limit("5/minute")
async def admin_health(request: Request, x_admin_key: str = Header(default="")):
    """Return operational health data for the admin console."""
    if x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid admin key.")

    snapshot = health_snapshot()
    return {
        "status": "ok",
        "uptime_seconds": snapshot["uptime_seconds"],
        "requests_served": snapshot["requests_served"],
        "last_error_timestamp": snapshot["last_error_timestamp"],
        "sentry_status": "configured" if settings.sentry_dsn else "disabled",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
