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

_connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
_engine = create_engine(
    settings.database_url,
    pool_pre_ping=not settings.database_url.startswith("sqlite"),
    connect_args=_connect_args,
    echo=False,  # never log SQL containing credentials
)

from .models import Base  # noqa: E402

# ── SQLite dev-only schema bootstrap ─────────────────────────────────────────
# Alembic owns all schema changes for PostgreSQL environments.
# For SQLite (local dev / tests), we auto-create tables so the app starts
# without running migrations manually.  Never call create_all in production.
if settings.database_url.startswith("sqlite"):
    Base.metadata.create_all(bind=_engine)

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
