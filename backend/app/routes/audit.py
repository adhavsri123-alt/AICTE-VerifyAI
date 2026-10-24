"""Audit trail endpoints — providing immutable event logs for compliance and accountability."""

from __future__ import annotations

import math
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Application, AuditEvent
from app.schemas import AuditEventItem, PaginatedAuditResponse

router = APIRouter(tags=["Audit Trail"])

# Sensitive keys that must NEVER be returned in audit responses
_SENSITIVE_KEY_SUBSTRINGS = (
    "password",
    "secret",
    "token",
    "key",
    "auth",
    "credential",
    "private",
    "content",
    "raw_bytes",
    "extracted_text",
    "traceback",
    "stacktrace",
)


def _sanitize_metadata(meta: dict | None) -> dict | None:
    """Filter out any sensitive, proprietary, or bulk text fields from metadata."""
    if not meta or not isinstance(meta, dict):
        return None
    safe: dict = {}
    for k, v in meta.items():
        k_lower = str(k).lower()
        if any(substr in k_lower for substr in _SENSITIVE_KEY_SUBSTRINGS):
            continue
        # If value is string and exceeds 500 chars, truncate it for safety
        if isinstance(v, str) and len(v) > 500:
            safe[k] = v[:500] + "... [truncated]"
        elif isinstance(v, dict):
            safe[k] = _sanitize_metadata(v)
        else:
            safe[k] = v
    return safe


def _to_audit_item(ev: AuditEvent) -> AuditEventItem:
    """Convert an ORM AuditEvent to an AuditEventItem with safe serialization."""
    summary = ev.details if ev.details else f"Audit event: {ev.event_type}"
    # Truncate summary to 255 chars if longer
    if len(summary) > 255:
        summary = summary[:252] + "..."

    return AuditEventItem(
        id=ev.id,
        timestamp=ev.created_at,
        created_at=ev.created_at,
        event_type=ev.event_type,
        application_id=ev.application_id,
        document_id=getattr(ev, "document_id", None),
        actor=ev.actor or "system",
        summary=summary,
        details=ev.details,
        metadata=_sanitize_metadata(getattr(ev, "metadata_payload", None)),
    )


@router.get(
    "/audit-trail",
    response_model=PaginatedAuditResponse,
    summary="List audit events across applications with filtering and pagination",
    description=(
        "Retrieves system and user audit trail records. Supports filtering by application ID, "
        "event type, and date range. Sensitive credentials and raw document contents are stripped."
    ),
)
def list_audit_trail(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    application_id: str | None = Query(None, description="Optional application UUID filter"),
    event_type: str | None = Query(None, description="Optional audit event type filter"),
    start_date: datetime | None = Query(None, description="Optional start datetime (UTC ISO 8601)"),
    end_date: datetime | None = Query(None, description="Optional end datetime (UTC ISO 8601)"),
    db: Session = Depends(get_db),
) -> PaginatedAuditResponse:
    query = db.query(AuditEvent)

    if application_id:
        query = query.filter(AuditEvent.application_id == application_id)
    if event_type:
        query = query.filter(AuditEvent.event_type == event_type.strip())
    if start_date:
        query = query.filter(AuditEvent.created_at >= start_date)
    if end_date:
        query = query.filter(AuditEvent.created_at <= end_date)

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))

    # Stable sorting: newest events first with id tie-breaker
    events = (
        query.order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [_to_audit_item(ev) for ev in events]

    return PaginatedAuditResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/applications/{application_id}/audit-trail",
    response_model=PaginatedAuditResponse,
    summary="List audit trail events for a specific application",
    description="Retrieves chronological audit events associated with the specified application.",
)
def get_application_audit_trail(
    application_id: str,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    event_type: str | None = Query(None, description="Optional audit event type filter"),
    db: Session = Depends(get_db),
) -> PaginatedAuditResponse:
    app = db.get(Application, application_id)
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    query = db.query(AuditEvent).filter(AuditEvent.application_id == application_id)
    if event_type:
        query = query.filter(AuditEvent.event_type == event_type.strip())

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))

    events = (
        query.order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [_to_audit_item(ev) for ev in events]

    return PaginatedAuditResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
