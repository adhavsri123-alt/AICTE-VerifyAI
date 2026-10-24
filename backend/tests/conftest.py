"""Shared test fixtures — isolated in-memory SQLite database and isolated temp storage."""

from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base, get_db
from app.main import create_app

# ---------------------------------------------------------------------------
# Engine & session for tests — uses an in-memory SQLite database so tests
# never touch the development database.
# ---------------------------------------------------------------------------

_TEST_DATABASE_URL = "sqlite:///file::memory:?cache=shared&uri=true"

_test_engine = create_engine(
    _TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

TestSessionLocal = sessionmaker(bind=_test_engine, autocommit=False, autoflush=False)


@pytest.fixture(scope="session", autouse=True)
def _create_test_tables() -> None:
    """Create all tables once for the test session."""
    import app.models as _models  # noqa: F841
    Base.metadata.create_all(bind=_test_engine)


@pytest.fixture(scope="session")
def temp_storage_dir(tmp_path_factory) -> Path:
    """Provide an isolated temporary directory for file storage during testing."""
    return tmp_path_factory.mktemp("test_docs_storage")


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    """Yield a transactional test session that is rolled back after each test."""
    connection = _test_engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(
    db_session: Session,
    temp_storage_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[TestClient, None, None]:
    """Provide a TestClient wired to the test database session and temporary storage."""
    monkeypatch.setenv("STORAGE_DIR", str(temp_storage_dir))
    monkeypatch.setenv("MAX_UPLOAD_SIZE_BYTES", "10485760")

    app = create_app()

    # Override the DB dependency to use our isolated session
    app.dependency_overrides[get_db] = lambda: db_session

    with TestClient(app) as tc:
        yield tc
