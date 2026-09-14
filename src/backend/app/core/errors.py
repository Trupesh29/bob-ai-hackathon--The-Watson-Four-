"""
Global exception handlers and consistent API error envelope.
"""

from __future__ import annotations

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorEnvelope(BaseModel):
    """Standard error response shape for all API errors."""

    detail: str
    error_code: str = "INTERNAL_ERROR"


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Return a tidy 422 envelope instead of the default FastAPI validation dump."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": str(exc.errors()),
            "error_code": "VALIDATION_ERROR",
        },
    )


async def generic_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """Catch-all 500 handler so unhandled exceptions never leak stack traces."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred.",
            "error_code": "INTERNAL_ERROR",
        },
    )
