import json
import os
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Optional

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


def _parse_origins(value: Optional[str]) -> list[str]:
    if not value:
        return ["http://localhost:5173"]
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(origin) for origin in parsed]
    except json.JSONDecodeError:
        pass
    return [origin.strip() for origin in value.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    groq_api_key: str = field(default_factory=lambda: os.getenv("GROQ_API_KEY", ""))
    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    groq_model: str = field(
        default_factory=lambda: os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    )
    gemini_model: str = field(
        default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    )
    gemini_fallback_models: list[str] = field(
        default_factory=lambda: [
            model.strip()
            for model in os.getenv(
                "GEMINI_FALLBACK_MODELS",
                "gemini-2.5-flash,gemini-2.0-flash,gemini-flash-latest",
            ).split(",")
            if model.strip()
        ]
    )
    sentry_dsn: str = field(default_factory=lambda: os.getenv("SENTRY_DSN", ""))
    admin_api_key: str = field(
        default_factory=lambda: os.getenv("ADMIN_API_KEY", "change-me")
    )
    allowed_origins: list[str] = field(
        default_factory=lambda: _parse_origins(os.getenv("ALLOWED_ORIGINS"))
    )
    environment: str = field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
