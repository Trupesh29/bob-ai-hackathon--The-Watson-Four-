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
from .api.v1.waiting_times import router as waiting_times_router
from .api.v1.alternate_routing import router as alternate_routing_router
from .api.v1.copilot import router as copilot_router
from .api.v1.operations_plan import router as operations_plan_router
from .api.v1.data_input import router as data_input_router
from .core.config import settings
from .core.errors import generic_exception_handler, validation_exception_handler

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger(__name__)


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Load ML artefacts once at startup.

    app.state.ml_predictor      — CongestionPredictor (congestion_pipeline.joblib)
    app.state.waiting_predictor — WaitingPredictor    (waiting_pipeline.joblib)

    Both default to None when the artefact is absent.
    A 503 is returned at request time when mode=ml and predictor is None.
    """
    import sys
    from pathlib import Path

    _src = Path(__file__).resolve().parent.parent.parent.parent
    if str(_src) not in sys.path:
        sys.path.insert(0, str(_src))

    artifact_dir = settings.get_ml_artifact_dir()

    # ── Congestion predictor ──────────────────────────────────────────────────
    congestion_path = artifact_dir / "congestion_pipeline.joblib"
    if congestion_path.exists():
        try:
            from ml.congestion_predict import CongestionPredictor  # type: ignore[import]
            app.state.ml_predictor = CongestionPredictor(pipeline_path=congestion_path)
            logger.info("Congestion ML artefact loaded from %s", congestion_path)
        except Exception as exc:
            logger.warning("Congestion ML artefact failed to load: %s", exc)
            app.state.ml_predictor = None
    else:
        logger.info("Congestion ML artefact not found — mode=ml returns 503")
        app.state.ml_predictor = None

    # ── Waiting-time predictor ────────────────────────────────────────────────
    waiting_path = artifact_dir / "waiting_pipeline.joblib"
    if waiting_path.exists():
        try:
            from ml.waiting_predict import WaitingPredictor  # type: ignore[import]
            app.state.waiting_predictor = WaitingPredictor(pipeline_path=waiting_path)
            logger.info("Waiting-time ML artefact loaded from %s", waiting_path)
        except Exception as exc:
            logger.warning("Waiting-time ML artefact failed to load: %s", exc)
            app.state.waiting_predictor = None
    else:
        logger.info("Waiting-time ML artefact not found — mode=ml returns 503")
        app.state.waiting_predictor = None

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
    app.include_router(waiting_times_router, prefix=settings.api_v1_prefix)
    app.include_router(alternate_routing_router, prefix=settings.api_v1_prefix)
    app.include_router(copilot_router, prefix=settings.api_v1_prefix)
    app.include_router(operations_plan_router, prefix=settings.api_v1_prefix)
    app.include_router(data_input_router, prefix=settings.api_v1_prefix)

    logger.info(
        "PortFlow AI API started | env=%s | version=%s",
        settings.app_env,
        settings.app_version,
    )

    return app


app = create_app()
