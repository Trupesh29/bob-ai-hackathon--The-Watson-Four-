"""
PortFlow AI — FastAPI application factory.

This module creates and configures the FastAPI application instance.
In Plan 2 scope: health endpoint only. No database connection is made.
Database models, CRUD, authentication, and feature endpoints are deferred
to later plans (see docs/AI_HANDOFF.md).
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from .api.v1.health import router as health_router
from .core.config import settings
from .core.errors import generic_exception_handler, validation_exception_handler

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "PortFlow AI — Container Congestion Predictor & Port Operations Optimiser. "
            "IBM Bobathon 2026, Track AI, Problem L1."
        ),
        docs_url=f"{settings.api_v1_prefix}/docs",
        redoc_url=f"{settings.api_v1_prefix}/redoc",
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ────────────────────────────────────────────────────
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(health_router, prefix=settings.api_v1_prefix)

    logger.info(
        "PortFlow AI API started | env=%s | version=%s",
        settings.app_env,
        settings.app_version,
    )

    return app


app = create_app()
