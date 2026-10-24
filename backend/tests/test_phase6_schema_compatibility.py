"""Tests for database schema compatibility and non-destructive migrations."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base, ensure_schema_compatibility
from app.models import Application, ApplicationStatus, AuditEvent, ReviewAction


class TestDatabaseSchemaCompatibility:
    """Ensure existing SQLite databases without Phase 6 columns/tables migrate smoothly."""

    def test_schema_compatibility_with_legacy_sqlite_db(self, tmp_path: Path) -> None:
        db_file = tmp_path / "legacy_test.db"
        sqlite_conn = sqlite3.connect(str(db_file))
        cursor = sqlite_conn.cursor()

        # Create a legacy 'applications' table without review_status, review_notes, reviewed_at, reviewer_actor
        cursor.execute(
            """
            CREATE TABLE applications (
                id VARCHAR(36) PRIMARY KEY,
                institution_name VARCHAR(255) NOT NULL,
                application_category VARCHAR(100) NOT NULL,
                academic_year VARCHAR(9) NOT NULL,
                status VARCHAR(50) NOT NULL,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            )
            """
        )

        # Create legacy 'audit_events' table without document_id, metadata_payload
        cursor.execute(
            """
            CREATE TABLE audit_events (
                id VARCHAR(36) PRIMARY KEY,
                application_id VARCHAR(36) NOT NULL,
                event_type VARCHAR(100) NOT NULL,
                actor VARCHAR(255),
                details TEXT,
                created_at TIMESTAMP
            )
            """
        )

        # Insert pre-existing legacy data
        cursor.execute(
            """
            INSERT INTO applications (id, institution_name, application_category, academic_year, status)
            VALUES ('app-legacy-1', 'Legacy Tech Institute', 'New Institution', '2024-2025', 'SUBMITTED')
            """
        )
        cursor.execute(
            """
            INSERT INTO audit_events (id, application_id, event_type, actor, details)
            VALUES ('audit-legacy-1', 'app-legacy-1', 'application_created', 'legacy_user', 'Created in legacy db')
            """
        )
        sqlite_conn.commit()
        sqlite_conn.close()

        # Now attach SQLAlchemy engine to this existing legacy SQLite database
        legacy_engine = create_engine(f"sqlite:///{db_file}")

        # Run schema compatibility migration
        ensure_schema_compatibility(legacy_engine)

        # Verify through SQLAlchemy that:
        # 1. Existing data is preserved
        # 2. New columns can be read (default None)
        # 3. New writes with new columns and new tables succeed without OperationalError
        SessionLocal = sessionmaker(bind=legacy_engine)
        with SessionLocal() as session:
            # 1. Read existing record
            app = session.get(Application, "app-legacy-1")
            assert app is not None
            assert app.institution_name == "Legacy Tech Institute"
            assert app.review_status is None  # newly added column defaults to None

            # 2. Update existing record with Phase 6 fields
            app.review_status = "in_review"
            app.review_notes = "Review started on legacy application"
            app.reviewer_actor = "officer_1"
            session.commit()

            # 3. Create a record in newly created ReviewAction table
            action = ReviewAction(
                application_id="app-legacy-1",
                previous_status="pending",
                new_status="in_review",
                note="Review started on legacy application",
                actor="officer_1",
            )
            session.add(action)

            # 4. Create an AuditEvent using newly added document_id & metadata_payload
            audit = AuditEvent(
                application_id="app-legacy-1",
                event_type="reviewer_action_recorded",
                actor="officer_1",
                details="Updated review status",
                document_id="doc-xyz",
                metadata_payload={"status": "in_review"},
            )
            session.add(audit)
            session.commit()

            # 5. Verify reads of new records
            actions = session.query(ReviewAction).filter(ReviewAction.application_id == "app-legacy-1").all()
            assert len(actions) == 1
            assert actions[0].new_status == "in_review"

            events = session.query(AuditEvent).filter(AuditEvent.id == audit.id).all()
            assert len(events) == 1
            assert events[0].document_id == "doc-xyz"
            assert events[0].metadata_payload == {"status": "in_review"}

        legacy_engine.dispose()
