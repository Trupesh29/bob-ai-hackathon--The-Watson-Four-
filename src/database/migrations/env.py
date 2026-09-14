"""
Alembic migrations environment.

DATABASE_URL is read from the application settings (pydantic-settings),
which sources it from the DATABASE_URL environment variable or .env file.
The URL is never logged or printed.
"""

from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# ── Path setup ────────────────────────────────────────────────────────────────
# Ensure src/ is on sys.path so backend package imports resolve.
_src_dir = Path(__file__).resolve().parents[2]  # src/database/migrations/env.py -> src/
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

# ── Import application models and settings ────────────────────────────────────
# Import models package first so all model classes register with Base.metadata.
import backend.app.models  # noqa: F401 — registers all ORM models
from backend.app.models.base import Base
from backend.app.core.config import settings

# ── Alembic config ────────────────────────────────────────────────────────────
config = context.config

if config.config_file_name:
    fileConfig(config.config_file_name)

# Inject DATABASE_URL from application settings (never from alembic.ini).
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no live DB connection needed)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (requires a live DB connection)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
