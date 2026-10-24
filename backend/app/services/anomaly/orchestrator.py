"""Anomaly Detection and Tamper Analysis Orchestrator."""

from __future__ import annotations

from typing import Any

from app.config import get_settings
from app.models import Document, ValidationFinding
from app.services.anomaly.alteration_detector import AlterationDetector
from app.services.anomaly.metadata_analyzer import AnomalyFinding, PDFMetadataAnalyzer, PDFMetadataResult
from app.services.anomaly.similarity_checker import NearDuplicateDetector
from app.services.file_storage import FileStorageService


class AnomalyOrchestrator:
    """Coordinates PDF metadata analysis, tamper detection, and near-duplicate text similarity."""

    def __init__(self, storage_service: FileStorageService | None = None) -> None:
        settings = get_settings()
        self.storage = storage_service or FileStorageService(settings.storage_dir)
        self.similarity_detector = NearDuplicateDetector(
            threshold=settings.near_duplicate_similarity_threshold,
        )

    def run_anomaly_checks(
        self,
        application_id: str,
        documents: list[Document],
    ) -> tuple[list[ValidationFinding], int, int]:
        """Execute all Phase 4 anomaly detection checks against an application's documents.

        Returns:
            tuple: (findings, checks_completed, checks_inconclusive)
        """
        raw_findings: list[AnomalyFinding] = []
        checks_completed = 0
        checks_inconclusive = 0

        # Cache for PDF metadata results per document
        pdf_metadata_map: dict[str, PDFMetadataResult] = {}

        # -------------------------------------------------------------
        # 1. Per-Document Metadata & Alteration Analysis
        # -------------------------------------------------------------
        for doc in documents:
            checks_completed += 1
            file_bytes: bytes | None = None

            try:
                file_bytes = self.storage.read_file(doc.storage_reference)
            except Exception:
                checks_inconclusive += 1
                continue

            # PDF metadata analysis
            pdf_meta: PDFMetadataResult | None = None
            if doc.mime_type == "application/pdf":
                pdf_meta = PDFMetadataAnalyzer.analyze(
                    pdf_bytes=file_bytes,
                    document_id=doc.id,
                    filename=doc.original_filename,
                )
                pdf_metadata_map[doc.id] = pdf_meta
                raw_findings.extend(pdf_meta.findings)

            # Alteration checks (image resolution, creation-mod gap, placeholder metadata)
            alteration_findings = AlterationDetector.check_document_alterations(
                doc=doc,
                file_bytes=file_bytes,
                pdf_metadata=pdf_meta,
            )
            raw_findings.extend(alteration_findings)

        # -------------------------------------------------------------
        # 2. Cross-Document Near-Duplicate Text Similarity Screening
        # -------------------------------------------------------------
        if len(documents) > 1:
            checks_completed += 1
            near_dup_findings, _ = self.similarity_detector.check_near_duplicates(documents)
            raw_findings.extend(near_dup_findings)

        # -------------------------------------------------------------
        # 3. Convert AnomalyFindings to ValidationFinding ORM instances
        # -------------------------------------------------------------
        orm_findings: list[ValidationFinding] = []
        for rf in raw_findings:
            orm_findings.append(
                ValidationFinding(
                    application_id=application_id,
                    document_id=rf.document_id,
                    finding_code=rf.finding_code,
                    severity=rf.severity,
                    title=rf.title,
                    explanation=rf.explanation,
                    evidence_reference=rf.evidence_reference,
                    recommended_action=rf.recommended_action,
                    review_status=rf.review_status,
                )
            )

        return orm_findings, checks_completed, checks_inconclusive

    def analyze_single_document(
        self,
        doc: Document,
    ) -> dict[str, Any]:
        """Perform deep metadata and alteration inspection on a single document for reviewer detail."""
        file_bytes: bytes | None = None
        try:
            file_bytes = self.storage.read_file(doc.storage_reference)
        except Exception:
            pass

        pdf_meta: PDFMetadataResult | None = None
        if file_bytes and doc.mime_type == "application/pdf":
            pdf_meta = PDFMetadataAnalyzer.analyze(
                pdf_bytes=file_bytes,
                document_id=doc.id,
                filename=doc.original_filename,
            )

        alteration_findings: list[AnomalyFinding] = []
        if file_bytes:
            alteration_findings = AlterationDetector.check_document_alterations(
                doc=doc,
                file_bytes=file_bytes,
                pdf_metadata=pdf_meta,
            )

        meta_findings = pdf_meta.findings if pdf_meta else []
        all_findings = meta_findings + alteration_findings

        return {
            "document_id": doc.id,
            "original_filename": doc.original_filename,
            "mime_type": doc.mime_type,
            "file_size": doc.file_size,
            "is_pdf": doc.mime_type == "application/pdf",
            "pdf_metadata": pdf_meta.raw_metadata if pdf_meta else None,
            "creation_date": pdf_meta.creation_date.isoformat() if pdf_meta and pdf_meta.creation_date else None,
            "mod_date": pdf_meta.mod_date.isoformat() if pdf_meta and pdf_meta.mod_date else None,
            "anomalies": [f.title for f in all_findings],
            "findings": [
                {
                    "finding_code": f.finding_code,
                    "severity": f.severity.value,
                    "title": f.title,
                    "explanation": f.explanation,
                    "evidence_reference": f.evidence_reference,
                    "recommended_action": f.recommended_action,
                }
                for f in all_findings
            ],
        }
