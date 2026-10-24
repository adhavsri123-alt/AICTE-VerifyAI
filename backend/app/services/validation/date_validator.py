"""Date and document validity validation service."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, timezone

from app.models import FindingReviewStatus, FindingSeverity


@dataclass
class DateValidationFinding:
    """Internal representation of a date-related finding."""

    finding_code: str
    severity: FindingSeverity
    title: str
    explanation: str
    evidence_reference: str
    recommended_action: str
    review_status: FindingReviewStatus = FindingReviewStatus.PENDING
    document_id: str | None = None


def parse_date_string(date_str: str | None) -> tuple[date | None, bool]:
    """Parse a date string across various common formats.

    Returns:
        tuple[date | None, is_ambiguous]:
        - If parsed successfully: (date_obj, False)
        - If input was present but cannot be parsed: (None, True)
        - If input was None or blank: (None, False)
    """
    if not date_str or not str(date_str).strip():
        return None, False

    clean = str(date_str).strip()

    # 1. Academic year pattern: e.g., 2024-2025 or 2024-25
    m_yr = re.match(r"^(\d{4})\s*[-–/]\s*(\d{2,4})$", clean)
    if m_yr:
        y2 = int(m_yr.group(2))
        if y2 < 100:
            y2 += 2000
        # Consider the end of that academic session (June 30)
        return date(y2, 6, 30), False

    # 2. Standard calendar formats
    formats = (
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y-%m-%d",
        "%d.%m.%Y",
        "%d %b %Y",
        "%d %B %Y",
        "%b %d, %Y",
        "%B %d, %Y",
        "%m/%d/%Y",
    )
    for fmt in formats:
        try:
            return datetime.strptime(clean, fmt).date(), False
        except ValueError:
            pass

    # Unparseable / ambiguous string
    return None, True


def validate_document_dates(
    document_id: str,
    original_filename: str,
    extracted_fields: dict | None,
    requires_expiry: bool = False,
    current_date: date | None = None,
) -> tuple[list[DateValidationFinding], int, int]:
    """Validate validity dates, issue dates, and date consistency for a single document.

    Returns:
        tuple: (findings, checks_completed, checks_inconclusive)
    """
    findings: list[DateValidationFinding] = []
    checks_completed = 0
    checks_inconclusive = 0

    if current_date is None:
        current_date = datetime.now(timezone.utc).date()

    fields = extracted_fields or {}
    raw_expiry = fields.get("validity_or_expiry_date")
    raw_issue = fields.get("issue_date")

    parsed_expiry = None
    parsed_issue = None

    # 1. Validity / Expiry Date Check
    if raw_expiry:
        parsed_expiry, is_ambiguous = parse_date_string(raw_expiry)
        if is_ambiguous:
            checks_inconclusive += 1
            findings.append(
                DateValidationFinding(
                    document_id=document_id,
                    finding_code="DATE_AMBIGUOUS_REVIEW_REQUIRED",
                    severity=FindingSeverity.LOW,
                    title=f"Ambiguous Validity Date: {original_filename}",
                    explanation=(
                        f"The extracted validity date string '{raw_expiry}' from '{original_filename}' "
                        f"is ambiguous or unparseable. Manual visual inspection is recommended."
                    ),
                    evidence_reference=f"raw_validity_string: '{raw_expiry}'",
                    recommended_action="Inspect the original document image/scan to verify validity period.",
                )
            )
        elif parsed_expiry:
            checks_completed += 1
            if parsed_expiry < current_date:
                findings.append(
                    DateValidationFinding(
                        document_id=document_id,
                        finding_code="DOC_EXPIRED",
                        severity=FindingSeverity.HIGH,
                        title=f"Document Validity Expired: {original_filename}",
                        explanation=(
                            f"The validity date '{raw_expiry}' (parsed as {parsed_expiry.isoformat()}) "
                            f"extracted from '{original_filename}' has passed relative to the current date "
                            f"({current_date.isoformat()})."
                        ),
                        evidence_reference=(
                            f"extracted_expiry: '{raw_expiry}', "
                            f"parsed_expiry: '{parsed_expiry.isoformat()}', "
                            f"current_date: '{current_date.isoformat()}'"
                        ),
                        recommended_action="Obtain and submit a renewed, currently valid certificate or approval.",
                    )
                )
    else:
        # No expiry date extracted
        if requires_expiry:
            checks_inconclusive += 1
            findings.append(
                DateValidationFinding(
                    document_id=document_id,
                    finding_code="EXPIRY_DATE_UNAVAILABLE",
                    severity=FindingSeverity.LOW,
                    title=f"Validity Date Not Extracted: {original_filename}",
                    explanation=(
                        f"Document type expects an explicit validity period, but no expiry date "
                        f"could be automatically extracted from '{original_filename}'."
                    ),
                    evidence_reference=f"document_id: '{document_id}'",
                    recommended_action="Check the document manually to confirm whether a validity duration exists.",
                )
            )

    # 2. Issue Date Check
    if raw_issue:
        parsed_issue, is_ambiguous_issue = parse_date_string(raw_issue)
        if is_ambiguous_issue:
            checks_inconclusive += 1
            findings.append(
                DateValidationFinding(
                    document_id=document_id,
                    finding_code="DATE_AMBIGUOUS_REVIEW_REQUIRED",
                    severity=FindingSeverity.LOW,
                    title=f"Ambiguous Issue Date: {original_filename}",
                    explanation=(
                        f"The extracted issue date string '{raw_issue}' from '{original_filename}' "
                        f"is ambiguous or unparseable."
                    ),
                    evidence_reference=f"raw_issue_string: '{raw_issue}'",
                    recommended_action="Verify the issue date visually on the document.",
                )
            )
        elif parsed_issue:
            checks_completed += 1
            if parsed_issue > current_date:
                findings.append(
                    DateValidationFinding(
                        document_id=document_id,
                        finding_code="ISSUE_DATE_IN_FUTURE",
                        severity=FindingSeverity.HIGH,
                        title=f"Issue Date in Future: {original_filename}",
                        explanation=(
                            f"Extracted issue date '{raw_issue}' (parsed as {parsed_issue.isoformat()}) "
                            f"is after the current date ({current_date.isoformat()})."
                        ),
                        evidence_reference=(
                            f"extracted_issue: '{raw_issue}', "
                            f"parsed_issue: '{parsed_issue.isoformat()}', "
                            f"current_date: '{current_date.isoformat()}'"
                        ),
                        recommended_action="Check if the document date was misread by OCR or contains a typo.",
                    )
                )

    # 3. Impossible Date Range Check
    if parsed_issue and parsed_expiry:
        checks_completed += 1
        if parsed_expiry < parsed_issue:
            findings.append(
                DateValidationFinding(
                    document_id=document_id,
                    finding_code="DATE_RANGE_INVALID",
                    severity=FindingSeverity.HIGH,
                    title=f"Invalid Date Range: {original_filename}",
                    explanation=(
                        f"Document '{original_filename}' has an extracted validity date ({parsed_expiry.isoformat()}) "
                        f"that precedes its issue date ({parsed_issue.isoformat()})."
                    ),
                    evidence_reference=(
                        f"issue_date: '{parsed_issue.isoformat()}', "
                        f"validity_date: '{parsed_expiry.isoformat()}'"
                    ),
                    recommended_action="Review the original certificate to confirm correct effective dates.",
                )
            )

    return findings, checks_completed, checks_inconclusive
