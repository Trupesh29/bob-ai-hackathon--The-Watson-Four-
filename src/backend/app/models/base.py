"""
SQLAlchemy 2 declarative base for all PortFlow AI models.

All ORM models must inherit from Base.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base — all models inherit from this class."""
    pass
