"""Issuer verification provider interfaces, outcome enums, and data models."""

from __future__ import annotations

import enum
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class IssuerVerificationOutcome(str, enum.Enum):
    """Explicit verification outcomes for issuer validation."""

    VERIFIED_BY_CONFIGURED_PROVIDER = "VERIFIED_BY_CONFIGURED_PROVIDER"
    MOCK_MATCH = "MOCK_MATCH"
    NO_MATCH = "NO_MATCH"
    MISMATCH = "MISMATCH"
    INSUFFICIENT_INFORMATION = "INSUFFICIENT_INFORMATION"
    UNAVAILABLE = "UNAVAILABLE"
    MANUAL_REVIEW_REQUIRED = "MANUAL_REVIEW_REQUIRED"


@dataclass
class IssuerVerificationRequest:
    """Standardized input payload for issuer verification providers."""

    document_id: str
    application_id: str
    document_type: str
    institution_name: str | None = None
    issuer_name: str | None = None
    issuer_id: str | None = None
    certificate_reference: str | None = None
    issue_date: str | None = None
    validity_date: str | None = None
    extracted_fields: dict[str, Any] = field(default_factory=dict)


@dataclass
class IssuerVerificationResponse:
    """Standardized result returned by all issuer verification providers."""

    outcome: IssuerVerificationOutcome
    provider_name: str
    is_mock: bool
    is_officially_verified: bool
    explanation: str
    matched_fields: dict[str, str] = field(default_factory=dict)
    unmatched_fields: dict[str, Any] = field(default_factory=dict)
    evidence_reference: str | None = None
    recommended_action: str | None = None
    requires_human_review: bool = True
    disclaimer: str = (
        "Notice: Issuer verification assistance provides decision-support cross-referencing. "
        "A mock provider result or unverified status does not constitute definitive regulatory "
        "rejection, nor does a mock match represent official government authentication."
    )
    verified_at: datetime = field(default_factory=_utcnow)


class VerificationProvider(ABC):
    """Abstract interface for external or mock document issuer verification providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider identifier."""
        ...

    @property
    @abstractmethod
    def is_mock(self) -> bool:
        """True if the provider returns synthetic or mock demonstration data."""
        ...

    @property
    @abstractmethod
    def is_available(self) -> bool:
        """True if the provider connection is configured and currently healthy."""
        ...

    @abstractmethod
    def verify(self, request: IssuerVerificationRequest) -> IssuerVerificationResponse:
        """Execute issuer verification against the provider registry."""
        ...
