"""
Health endpoint — GET /api/v1/health

Returns the API liveness status. No authentication required.
No database connection attempted in this plan.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health", tags=["system"])
async def health_check() -> dict:
    """
    Liveness check.

    Returns:
        A JSON object confirming the service is running.
    """
    return {
        "status": "healthy",
        "service": "portflow-api",
        "version": "0.1.0",
    }
