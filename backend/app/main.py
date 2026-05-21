from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.limiter import SLOWAPI_AVAILABLE, limiter
from app.core.metrics import increment_requests, mark_error
from app.core.sentry import init_sentry
from app.routes.health import router as health_router
from app.routes.simulate import router as simulate_router


init_sentry()

app = FastAPI(
    title="ForesightX API",
    description="Cinematic AI future simulation backend.",
    version="0.1.0",
)

app.state.limiter = limiter
if SLOWAPI_AVAILABLE:
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware

    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Key"],
)

app.include_router(health_router)
app.include_router(simulate_router)


@app.middleware("http")
async def metrics_middleware(request, call_next):
    increment_requests()
    try:
        return await call_next(request)
    except Exception:
        mark_error()
        raise


@app.get("/")
async def root():
    return {
        "name": "ForesightX",
        "tagline": "Every decision rewrites the future. See all versions of it.",
        "status": "online",
    }
