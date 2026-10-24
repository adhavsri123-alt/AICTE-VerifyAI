"""PDF text and image extraction using PyMuPDF (pymupdf)."""

from __future__ import annotations

from dataclasses import dataclass, field

import pymupdf


@dataclass
class PDFExtractionResult:
    """Outcome of PDF extraction."""

    text: str = ""
    page_count: int = 0
    is_scanned: bool = False
    page_images: list[bytes] = field(default_factory=list)
    error: str | None = None


class PDFExtractor:
    """Extracts embedded text and renders page images for scanned PDFs."""

    def __init__(self, max_pages: int = 50, max_chars: int = 500_000) -> None:
        self.max_pages = max_pages
        self.max_chars = max_chars

    def extract(self, pdf_bytes: bytes) -> PDFExtractionResult:
        """Extract text from PDF bytes.

        If the PDF contains embedded text, it aggregates the text.
        If the PDF contains little to no text (< 20 characters), it marks
        the document as `is_scanned=True` and renders page images for OCR.
        """
        try:
            doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        except Exception as exc:
            return PDFExtractionResult(
                error=f"Corrupted or invalid PDF format: {exc.__class__.__name__}"
            )

        try:
            page_count = len(doc)
            if page_count == 0:
                return PDFExtractionResult(error="The PDF document contains 0 pages.")

            pages_to_process = min(page_count, self.max_pages)
            extracted_pages: list[str] = []
            total_chars = 0

            for page_idx in range(pages_to_process):
                page = doc[page_idx]
                page_text = page.get_text() or ""
                extracted_pages.append(page_text.strip())
                total_chars += len(page_text)
                if total_chars >= self.max_chars:
                    break

            combined_text = "\n\n".join(filter(None, extracted_pages)).strip()

            # Determine whether the document is scanned / image-only
            # (threshold: fewer than 20 non-whitespace characters across pages)
            non_ws_count = len("".join(combined_text.split()))
            if non_ws_count < 20:
                # Render page images (up to 5 pages for OCR to prevent memory explosion)
                page_images: list[bytes] = []
                ocr_page_limit = min(page_count, 5)
                for page_idx in range(ocr_page_limit):
                    try:
                        pix = doc[page_idx].get_pixmap(dpi=150)
                        page_images.append(pix.tobytes("png"))
                    except Exception:
                        pass

                return PDFExtractionResult(
                    text=combined_text,
                    page_count=page_count,
                    is_scanned=True,
                    page_images=page_images,
                )

            return PDFExtractionResult(
                text=combined_text,
                page_count=page_count,
                is_scanned=False,
            )

        finally:
            doc.close()
