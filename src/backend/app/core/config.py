"""
Application settings loaded from environment variables via pydantic-settings.
"""

from __future__ import annotations

import json
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All runtime configuration for the PortFlow AI backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application identity
    app_name: str = "PortFlow AI API"
    app_env: str = "development"
    app_version: str = "0.1.0"

    # API
    api_v1_prefix: str = "/api/v1"

    # Database — read from environment; never logged
    database_url: str = (
        "postgresql+psycopg://portflow:change-me@localhost:5432/portflow"
    )

    # CORS — accepts a JSON-encoded list or a comma-separated string
    cors_origins: str = '["http://localhost:5173"]'

    # Logging
    log_level: str = "INFO"

    # Synthetic data
    synthetic_data_seed: int = 2026

    def get_cors_origins(self) -> List[str]:
        """Return CORS origins as a Python list."""
        value = self.cors_origins.strip()
        if value.startswith("["):
            return json.loads(value)
        return [origin.strip() for origin in value.split(",") if origin.strip()]


settings = Settings()
