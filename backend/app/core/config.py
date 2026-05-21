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
