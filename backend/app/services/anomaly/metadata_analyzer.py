"""PDF metadata inspection and timestamp consistency analysis."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import pymupdf

from app.models import FindingReviewStatus, FindingSeverity


@dataclass
class AnomalyFinding:
    """Internal representation of an anomaly or tamper analysis finding."""

    finding_code: str
    severity: FindingSeverity
    title: str
    explanation: str
    evidence_reference: str
    recommended_action: str
    document_id: str | None = None
    review_status: FindingReviewStatus = FindingReviewStatus.PENDING


@dataclass
class PDFMetadataResult:
    """Outcome of PDF metadata inspection."""

    is_valid_pdf: bool = True
    page_count: int = 0
    format: str = ""
    creator: str = ""
    producer: str = ""
    title: str = ""
    author: str = ""
    subject: str = ""
    keywords: str = ""
    creation_date_raw: str = ""
    mod_date_raw: str = ""
    creation_date: datetime | None = None
    mod_date: datetime | None = None
    is_encrypted: bool = False
    raw_metadata: dict[str, Any] = field(default_factory=dict)
    findings: list[AnomalyFinding] = field(default_factory=list)
    error: str | None = None


def parse_pdf_date(date_str: str | None) -> datetime | None:
    """Parse a PDF date string (e.g. 'D:20240501143000Z' or '2024-05-01') into a UTC datetime."""
    if not date_str or not isinstance(date_str, str):
        return None

    cleaned = date_str.strip()
    if not cleaned:
        return None

    # Strip PDF 'D:' prefix if present
    cleaned = re.sub(r"^[Dd]:", "", cleaned)

    # Extract digits: standard PDF dates are YYYYMMDDHHmmSS
    digits = re.sub(r"[^\d]", "", cleaned)
    if len(digits) >= 14:
        try:
            dt = datetime(
                year=int(digits[0:4]),
                month=int(digits[4:6]),
                day=int(digits[6:8]),
                hour=int(digits[8:10]),
                minute=int(digits[10:12]),
                second=int(digits[12:14]),
                tzinfo=timezone.utc,
            )
            return dt
        except ValueError:
            pass

    if len(digits) >= 8:
        try:
            dt = datetime(
                year=int(digits[0:4]),
                month=int(digits[4:6]),
                day=int(digits[6:8]),
                tzinfo=timezone.utc,
            )
            return dt
        except ValueError:
            pass

    # Try ISO formats as fallback
    for iso_fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            parsed = datetime.strptime(cleaned[:19], iso_fmt)
            return parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    return None


class PDFMetadataAnalyzer:
    """Inspects PDF structural metadata and detects timestamp/software anomalies."""

    SUSPICIOUS_PRODUCERS = (
        "ilovepdf",
        "pdf24",
        "smallpdf",
        "canva",
        "photoshop",
        "gimp",
        "sejda",
        "pdfescape",
    )

    @classmethod
    def analyze(
        cls,
        pdf_bytes: bytes,
        document_id: str | None = None,
        filename: str = "document.pdf",
    ) -> PDFMetadataResult:
        """Parse and inspect PDF metadata, returning findings for any observed anomalies."""
        try:
            doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        except Exception as exc:
            return PDFMetadataResult(
                is_valid_pdf=False,
                error=f"Corrupted or invalid PDF format: {exc.__class__.__name__}",
            )

        try:
            page_count = len(doc)
            meta = doc.metadata or {}
            is_encrypted = doc.is_encrypted

            creator = (meta.get("creator") or "").strip()
            producer = (meta.get("producer") or "").strip()
            title = (meta.get("title") or "").strip()
            author = (meta.get("author") or "").strip()
            subject = (meta.get("subject") or "").strip()
            keywords = (meta.get("keywords") or "").strip()
            creation_raw = (meta.get("creationDate") or "").strip()
            mod_raw = (meta.get("modDate") or "").strip()
            fmt = (meta.get("format") or "").strip()

            c_date = parse_pdf_date(creation_raw)
            m_date = parse_pdf_date(mod_raw)

            result = PDFMetadataResult(
                is_valid_pdf=True,
                page_count=page_count,
                format=fmt,
                creator=creator,
                producer=producer,
                title=title,
                author=author,
                subject=subject,
                keywords=keywords,
                creation_date_raw=creation_raw,
                mod_date_raw=mod_raw,
                creation_date=c_date,
                mod_date=m_date,
                is_encrypted=is_encrypted,
                raw_metadata=meta,
            )

            # -------------------------------------------------------------
            # Check 1: Missing metadata
            # -------------------------------------------------------------
            has_no_software_info = not creator and not producer
            has_no_dates = not creation_raw and not mod_raw
            if has_no_software_info and has_no_dates:
                result.findings.append(
                    AnomalyFinding(
                        document_id=document_id,
                        finding_code="PDF_METADATA_MISSING",
                        severity=FindingSeverity.LOW,
                        title=f"PDF Metadata Missing or Stripped: {filename}",
                        explanation=(
                            f"Document '{filename}' contains no authoring metadata (creator, producer, "
                            f"and timestamp fields are empty). Note: Stripped metadata is common when documents "
                            f"are scanned, printed to PDF, or sanitized by privacy tools; it is an advisory observation "
                            f"for reviewer awareness rather than proof of tampering."
                        ),
                        evidence_reference=(
                            f"filename: '{filename}', creator: '{creator}', producer: '{producer}', "
                            f"creationDate: '{creation_raw}', modDate: '{mod_raw}'"
                        ),
                        recommended_action=(
                            "Review the document visual appearance and content; missing metadata alone does not "
                            "warrant application rejection."
                        ),
                    )
                )

            # -------------------------------------------------------------
            # Check 2: Timestamp Inconsistencies
            # -------------------------------------------------------------
            now = datetime.now(timezone.utc)

            # 2a. Modification date earlier than creation date
            if c_date and m_date:
                # Allow 60 seconds tolerance for clock skew
                if m_date < c_date and (c_date - m_date).total_seconds() > 60:
                    delta_seconds = int((c_date - m_date).total_seconds())
                    result.findings.append(
                        AnomalyFinding(
                            document_id=document_id,
                            finding_code="PDF_TIMESTAMP_INCONSISTENCY",
                            severity=FindingSeverity.MEDIUM,
                            title=f"PDF Timestamp Inconsistency: {filename}",
                            explanation=(
                                f"In document '{filename}', the recorded modification timestamp ({m_date.isoformat()}) "
                                f"precedes the creation timestamp ({c_date.isoformat()}) by {delta_seconds} seconds. "
                                f"In standard PDF authoring workflows, modifications occur at or after initial creation. "
                                f"This anomaly suggests metadata manipulation, clock desynchronization, or file splicing."
                            ),
                            evidence_reference=(
                                f"creation_date: '{creation_raw}' ({c_date.isoformat()}), "
                                f"modification_date: '{mod_raw}' ({m_date.isoformat()}), "
                                f"delta_seconds: {delta_seconds}"
                            ),
                            recommended_action=(
                                "Inspect document modification history and compare against issued records."
                            ),
                        )
                    )

            # 2b. Future timestamps
            for date_val, raw_str, label in (
                (c_date, creation_raw, "Creation"),
                (m_date, mod_raw, "Modification"),
            ):
                if date_val and date_val > now and (date_val - now).total_seconds() > 86400:
                    result.findings.append(
                        AnomalyFinding(
                            document_id=document_id,
                            finding_code="PDF_TIMESTAMP_INCONSISTENCY",
                            severity=FindingSeverity.LOW,
                            title=f"Future {label} Timestamp: {filename}",
                            explanation=(
                                f"The {label.lower()} timestamp for '{filename}' ({date_val.date().isoformat()}) "
                                f"is set in the future relative to server time. This usually indicates an incorrect "
                                f"system clock on the authoring computer."
                            ),
                            evidence_reference=f"field: '{label}', raw_timestamp: '{raw_str}'",
                            recommended_action="Verify file issuance dates against declared certificates.",
                        )
                    )

            # -------------------------------------------------------------
            # Check 3: Third-party editing / modification tool indicator
            # -------------------------------------------------------------
            combined_software = f"{creator} {producer}".lower()
            detected_tool = next(
                (tool for tool in cls.SUSPICIOUS_PRODUCERS if tool in combined_software),
                None,
            )
            if detected_tool:
                result.findings.append(
                    AnomalyFinding(
                        document_id=document_id,
                        finding_code="DOCUMENT_METADATA_ANOMALY",
                        severity=FindingSeverity.LOW,
                        title=f"Third-Party PDF Editing Tool Detected: {filename}",
                        explanation=(
                            f"Document '{filename}' metadata indicates processing by online editing/conversion software "
                            f"('{detected_tool.title()}'). Official institutional certificates typically originate directly from "
                            f"issuing authorities or ERP systems. Note: Applicants frequently use online utilities legitimately "
                            f"for PDF compression or format conversion."
                        ),
                        evidence_reference=(
                            f"detected_tool: '{detected_tool}', "
                            f"creator: '{creator}', "
                            f"producer: '{producer}'"
                        ),
                        recommended_action=(
                            "Examine whether document content exhibits signs of graphic tampering, altered numbers, or inserted text."
                        ),
                    )
                )

            return result

        finally:
            doc.close()
