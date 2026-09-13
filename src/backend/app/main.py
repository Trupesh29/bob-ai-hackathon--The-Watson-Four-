"""
PortFlow AI — FastAPI application factory.

This module creates and configures the FastAPI application instance.
The ML predictor is loaded once at startup via the lifespan context and
stored in app.state.ml_predictor (None if the artefact is absent).
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from .api.v1.health import router as health_router
from .api.v1.dashboard import router as dashboard_router
from .api.v1.schedules import router as schedules_router
from .api.v1.resources import router as resources_router
from .core.config import settings
from .core.errors import generic_exception_handler, validation_exception_handler

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger(__name__)


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Load the ML artefact once at startup.

    Stores a CongestionPredictor in app.state.ml_predictor when the joblib
    file is present; stores None otherwise.  A 503 is returned at request time
    when mode=ml is selected and app.state.ml_predictor is None.
    """
    import sys
    from pathlib import Path

    # Add src/ to path so ml.congestion_predict can be imported
    _src = Path(__file__).resolve().parent.parent.parent.parent
    if str(_src) not in sys.path:
        sys.path.insert(0, str(_src))

    artifact_dir = settings.get_ml_artifact_dir()
    pipeline_path = artifact_dir / "congestion_pipeline.joblib"

    if pipeline_path.exists():
        try:
            from ml.congestion_predict import CongestionPredictor  # type: ignore[import]
            app.state.ml_predictor = CongestionPredictor(pipeline_path=pipeline_path)
            logger.info("ML artefact loaded from %s", pipeline_path)
        except Exception as exc:
            logger.warning("ML artefact found but failed to load: %s", exc)
            app.state.ml_predictor = None
    else:
        logger.info(
            "ML artefact not found at %s — mode=ml will return 503", pipeline_path
        )
        app.state.ml_predictor = None

    yield
    # No teardown required


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
        lifespan=_lifespan,
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
    app.include_router(dashboard_router, prefix=settings.api_v1_prefix)
    app.include_router(schedules_router, prefix=settings.api_v1_prefix)
    app.include_router(resources_router, prefix=settings.api_v1_prefix)

    logger.info(
        "PortFlow AI API started | env=%s | version=%s",
        settings.app_env,
        settings.app_version,
    )

    return app


app = create_app()
