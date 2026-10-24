"""SQLAlchemy engine, session factory, and Base declarative class."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

_settings = get_settings()

# For SQLite, ``check_same_thread`` must be disabled when the engine is
# shared across FastAPI's async workers.
_connect_args: dict = {}
if _settings.database_url.startswith("sqlite"):
    _connect_args["check_same_thread"] = False

engine = create_engine(
    _settings.database_url,
    connect_args=_connect_args,
    echo=_settings.app_debug,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


def get_db() -> Generator[Session, None, None]:
    """Yield a scoped database session and ensure it is closed afterwards.

    Usage as a FastAPI dependency::

        @router.get("/items")
        def list_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema_compatibility(target_engine=None) -> None:
    """Ensure all table columns defined in SQLAlchemy models exist in the target database.

    SQLAlchemy's ``create_all()`` only creates tables that do not exist; it does not add
    newly introduced columns to existing tables. This function inspects existing tables
    and performs safe ``ALTER TABLE ... ADD COLUMN`` migrations for any missing columns,
    preventing runtime OperationalError (e.g., e3q8) when new model fields are added to an
    already existing database.
    """
    import app.models  # noqa: F401
    from sqlalchemy import inspect, text
    from sqlalchemy.engine import Connection

    target = target_engine or engine
    inspector = inspect(target)
    existing_tables = set(inspector.get_table_names())

    def _sync_on_connection(conn: Connection) -> None:
        for table_name, table in Base.metadata.tables.items():
            if table_name not in existing_tables:
                table.create(conn)
                existing_tables.add(table_name)
                continue

            existing_columns = {col["name"] for col in inspector.get_columns(table_name)}

            for column in table.columns:
                if column.name not in existing_columns:
                    col_type = column.type.compile(dialect=conn.dialect)
                    default_clause = ""
                    if column.default is not None:
                        arg = column.default.arg
                        if isinstance(arg, str):
                            default_clause = f" DEFAULT '{arg}'"
                        elif isinstance(arg, (int, float)):
                            default_clause = f" DEFAULT {arg}"
                    elif not column.nullable:
                        if any(t in col_type.upper() for t in ("VARCHAR", "TEXT", "CHAR")):
                            default_clause = " DEFAULT ''"

                    alter_stmt = f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type}{default_clause}"
                    conn.execute(text(alter_stmt))
        conn.commit()

    if isinstance(target, Connection):
        _sync_on_connection(target)
    else:
        with target.connect() as conn:
            _sync_on_connection(conn)


