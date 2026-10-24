"""Document alteration indicators and consistency screening."""

from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO

from PIL import Image

from app.models import Document, FindingReviewStatus, FindingSeverity
from app.services.anomaly.metadata_analyzer import AnomalyFinding, PDFMetadataResult


class AlterationDetector:
    """Inspects defensible physical and metadata indicators of potential document alteration."""

    @classmethod
    def check_document_alterations(
        cls,
        doc: Document,
        file_bytes: bytes,
        pdf_metadata: PDFMetadataResult | None = None,
    ) -> list[AnomalyFinding]:
        """Perform explainable alteration checks using current stack capabilities."""
        findings: list[AnomalyFinding] = []

        # -------------------------------------------------------------
        # 1. Image Quality & Dimension Verification (Images or Scanned PDFs)
        # -------------------------------------------------------------
        if doc.mime_type in ("image/png", "image/jpeg"):
            try:
                with Image.open(BytesIO(file_bytes)) as img:
                    width, height = img.size
                    # Check for abnormally low resolution (e.g., < 400px on either side)
                    if width < 400 or height < 400:
                        findings.append(
                            AnomalyFinding(
                                document_id=doc.id,
                                finding_code="DOCUMENT_TAMPER_INDICATOR",
                                severity=FindingSeverity.LOW,
                                title=f"Low Resolution Document Image: {doc.original_filename}",
                                explanation=(
                                    f"The uploaded document image has unusually low dimensions ({width}x{height} pixels). "
                                    f"Low-resolution images frequently obscure micro-print, seal boundaries, or text "
                                    f"modifications, making automated verification unreliable."
                                ),
                                evidence_reference=(
                                    f"mime_type: '{doc.mime_type}', width: {width}, height: {height}, "
                                    f"file_size_bytes: {doc.file_size}"
                                ),
                                recommended_action=(
                                    "Request a high-resolution scan (300 DPI recommended) or inspect the original physical document."
                                ),
                                review_status=FindingReviewStatus.PENDING,
                            )
                        )
            except Exception:
                # Do not crash if image headers cannot be parsed
                pass

        # -------------------------------------------------------------
        # 2. PDF Creation-Modification Gap (Long-interval retrospective edit)
        # -------------------------------------------------------------
        if pdf_metadata and pdf_metadata.is_valid_pdf:
            c_date = pdf_metadata.creation_date
            m_date = pdf_metadata.mod_date

            if c_date and m_date:
                gap_days = (m_date - c_date).total_seconds() / 86400.0
                # If modified more than 2 years (730 days) after original creation
                if gap_days > 730:
                    findings.append(
                        AnomalyFinding(
                            document_id=doc.id,
                            finding_code="DOCUMENT_METADATA_ANOMALY",
                            severity=FindingSeverity.LOW,
                            title=f"Significant Creation-Modification Gap: {doc.original_filename}",
                            explanation=(
                                f"In document '{doc.original_filename}', the modification timestamp ({m_date.date().isoformat()}) "
                                f"is {int(gap_days)} days (over {int(gap_days / 365)} years) after the initial creation timestamp "
                                f"({c_date.date().isoformat()}). While re-saving older templates is common, retrospective modification "
                                f"of historical certificates warrants verification of altered figures or dates."
                            ),
                            evidence_reference=(
                                f"creation_date: '{pdf_metadata.creation_date_raw}', "
                                f"mod_date: '{pdf_metadata.mod_date_raw}', "
                                f"gap_days: {int(gap_days)}"
                            ),
                            recommended_action=(
                                "Verify whether certificate numbers, dates, and seal text correspond to recent re-issuance."
                            ),
                            review_status=FindingReviewStatus.PENDING,
                        )
                    )

            # ---------------------------------------------------------
            # 3. Document Title / Author Contradiction with Institution
            # ---------------------------------------------------------
            meta_author = (pdf_metadata.author or "").strip().lower()
            meta_title = (pdf_metadata.title or "").strip().lower()

            # Suspicious template keywords in author/title
            suspicious_terms = ("fake", "sample template", "dummy", "lorem ipsum", "editable")
            for term in suspicious_terms:
                if term in meta_author or term in meta_title:
                    findings.append(
                        AnomalyFinding(
                            document_id=doc.id,
                            finding_code="DOCUMENT_TAMPER_INDICATOR",
                            severity=FindingSeverity.HIGH,
                            title=f"Suspicious Document Metadata Identifier: {doc.original_filename}",
                            explanation=(
                                f"Document '{doc.original_filename}' metadata title or author field contains "
                                f"placeholder or test keyword '{term}'. This strongly suggests the document was "
                                f"generated from a mockup or sample template."
                            ),
                            evidence_reference=(
                                f"title: '{pdf_metadata.title}', author: '{pdf_metadata.author}', "
                                f"flagged_term: '{term}'"
                            ),
                            recommended_action=(
                                "Escalate for manual forensic inspection; reject template placeholder submissions."
                            ),
                            review_status=FindingReviewStatus.PENDING,
                        )
                    )
                    break

        return findings
