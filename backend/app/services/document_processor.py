"""Orchestrator for text extraction, OCR, document classification, and field extraction."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    AuditEvent,
    Document,
    DocumentProcessingStatus,
)
from app.services.document_classifier import classify_document_text
from app.services.field_extractor import extract_structured_fields
from app.services.file_storage import FileStorageService
from app.services.ocr_service import OCRService
from app.services.pdf_extractor import PDFExtractor


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DocumentProcessor:
    """Coordinates file reading, extraction, classification, and metadata persistence."""

    def __init__(self, storage_service: FileStorageService | None = None) -> None:
        settings = get_settings()
        self.storage = storage_service or FileStorageService(settings.storage_dir)
        self.pdf_extractor = PDFExtractor()
        self.ocr_service = OCRService(settings.tesseract_cmd)

    def process_document(self, document_id: str, db: Session) -> Document:
        """Process an uploaded document: extract text, classify, extract fields, and record audit."""
        doc = db.get(Document, document_id)
        if not doc:
            raise ValueError(f"Document with id {document_id} not found.")

        doc.processing_status = DocumentProcessingStatus.PROCESSING
        db.commit()

        try:
            # 1. Read file bytes safely from storage
            content = self.storage.read_file(doc.storage_reference)
            extracted_text = ""
            confidence_score: float | None = None
            error_summary: str | None = None

            # 2. Extract based on MIME type
            if doc.mime_type == "application/pdf":
                pdf_res = self.pdf_extractor.extract(content)
                if pdf_res.error:
                    doc.processing_status = DocumentProcessingStatus.FAILED
                    doc.processing_error = pdf_res.error
                    doc.processed_at = _utcnow()
                    self._record_audit(db, doc, "document_processing_failed", pdf_res.error)
                    db.commit()
                    return doc

                if pdf_res.is_scanned:
                    # Scanned PDF: attempt OCR on page images
                    if not self.ocr_service.is_engine_available():
                        doc.processing_status = DocumentProcessingStatus.FAILED
                        doc.processing_error = (
                            "Document is a scanned image-only PDF. OCR is required for text "
                            "extraction, but Tesseract OCR engine is not installed or available on PATH."
                        )
                        doc.processed_at = _utcnow()
                        self._record_audit(db, doc, "document_processing_failed", doc.processing_error)
                        db.commit()
                        return doc

                    # Run OCR on rendered page images
                    ocr_texts: list[str] = []
                    ocr_confs: list[float] = []
                    for page_img in pdf_res.page_images:
                        ocr_res = self.ocr_service.extract_text(page_img)
                        if ocr_res.success and ocr_res.text:
                            ocr_texts.append(ocr_res.text)
                            if ocr_res.confidence is not None:
                                ocr_confs.append(ocr_res.confidence)

                    extracted_text = "\n\n".join(ocr_texts).strip()
                    if ocr_confs:
                        confidence_score = round(sum(ocr_confs) / len(ocr_confs), 2)
                else:
                    extracted_text = pdf_res.text
                    confidence_score = 0.95  # Direct digital PDF extraction confidence

            elif doc.mime_type in ("image/png", "image/jpeg"):
                # Run OCR on image
                ocr_res = self.ocr_service.extract_text(content)
                if not ocr_res.success:
                    doc.processing_status = DocumentProcessingStatus.FAILED
                    doc.processing_error = ocr_res.error_message or "Image OCR extraction failed."
                    doc.processed_at = _utcnow()
                    self._record_audit(db, doc, "document_processing_failed", doc.processing_error)
                    db.commit()
                    return doc

                extracted_text = ocr_res.text
                confidence_score = ocr_res.confidence

            # 3. Classify document text if not already explicitly categorized
            classification = classify_document_text(extracted_text)
            if doc.document_type in ("unclassified", "", None):
                doc.document_type = classification.document_type

            # 4. Extract structured fields
            fields = extract_structured_fields(extracted_text)
            fields_dict = fields.to_dict()
            fields_dict["classification_matched_keywords"] = classification.matched_keywords
            fields_dict["classification_method"] = classification.method

            # 5. Determine final processing status
            # If text is empty or very short, mark as needs_review
            if not extracted_text or len(extracted_text.strip()) < 10:
                doc.processing_status = DocumentProcessingStatus.NEEDS_REVIEW
                doc.processing_error = "Document processed but little to no readable text was extracted."
            else:
                doc.processing_status = DocumentProcessingStatus.COMPLETED
                doc.processing_error = None

            # Limit saved text size to 50,000 characters to prevent excessive DB bloat
            doc.extracted_text = extracted_text[:50_000] if extracted_text else None
            doc.extracted_fields = fields_dict
            doc.processed_at = _utcnow()

            # 6. Audit logging
            event_type = (
                "document_processed"
                if doc.processing_status == DocumentProcessingStatus.COMPLETED
                else "document_needs_review"
            )
            audit_details = (
                f"Document '{doc.original_filename}' processed. Type: {doc.document_type}, "
                f"Chars: {len(extracted_text or '')}, Status: {doc.processing_status.value}"
            )
            self._record_audit(db, doc, event_type, audit_details)

            db.commit()
            db.refresh(doc)
            return doc

        except Exception as exc:
            db.rollback()
            # Clean non-sensitive error summary
            error_msg = f"Unexpected document processing error: {exc.__class__.__name__}"
            try:
                doc_to_update = db.get(Document, document_id)
                if doc_to_update:
                    doc_to_update.processing_status = DocumentProcessingStatus.FAILED
                    doc_to_update.processing_error = error_msg
                    doc_to_update.processed_at = _utcnow()
                    self._record_audit(db, doc_to_update, "document_processing_failed", error_msg)
                    db.commit()
            except Exception:
                pass
            return doc

    def _record_audit(self, db: Session, doc: Document, event_type: str, details: str) -> None:
        """Write an immutable AuditEvent record."""
        audit = AuditEvent(
            application_id=doc.application_id,
            event_type=event_type,
            actor="system:document_pipeline",
            details=details,
        )
        db.add(audit)
