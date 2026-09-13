"""
Centralised SQLAlchemy engine and session management.

Usage (FastAPI dependency injection):

    from backend.app.dependencies import get_db

    @router.get("/example")
    def example(db: Session = Depends(get_db)):
        ...

The DATABASE_URL is read from settings. It is never logged.
No schema is created here; Alembic owns all migrations.
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .core.config import settings

# pool_pre_ping tests the connection before use, handling stale connections
# from Render-style managed PostgreSQL instances.
_engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    echo=False,  # never log SQL containing credentials
)

_SessionLocal = sessionmaker(
    bind=_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a database session and guarantees closure.

    Yields:
        An open SQLAlchemy Session bound to the configured PostgreSQL database.
    """
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_engine():  # type: ignore[return]
    """Return the shared SQLAlchemy engine (for migrations and tests)."""
    return _engine
