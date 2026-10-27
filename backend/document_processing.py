"""
Document Processing & Text Extraction Pipeline
Supports:
1. PDF text extraction via PyMuPDF (fitz / pymupdf)
2. Scanned image extraction via Tesseract OCR with graceful fallback if tesseract.exe is unavailable
3. SHA-256 cryptographic file-integrity checksum calculation
4. Extracted field recognition (institution, reference numbers, dates, cadre, areas)
5. Regulatory rule checks integration
"""

import os
import hashlib
import json
import shutil
from typing import Dict, Any, Tuple, List, Optional
from datetime import datetime, timezone

# Import PyMuPDF
try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

# Import pytesseract & PIL
try:
    import pytesseract
    from PIL import Image
    HAS_PYTESSERACT_LIB = True
except ImportError:
    pytesseract = None
    Image = None
    HAS_PYTESSERACT_LIB = False


ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff"}
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB limit


def check_tesseract_engine_available() -> Tuple[bool, str]:
    """
    Checks if the actual Tesseract OCR binary executable is available on the system PATH.
    Gracefully handles absence and provides exact documentation/setup instructions.
    """
    if not HAS_PYTESSERACT_LIB:
        return False, "pytesseract Python package is not installed."

    # Common Windows installation locations for Tesseract
    windows_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expanduser(r"~\AppData\Local\Tesseract-OCR\tesseract.exe"),
    ]
    for p in windows_paths:
        if os.path.exists(p):
            pytesseract.pytesseract.tesseract_cmd = p
            return True, f"Tesseract engine detected at {p}"

    # Check system PATH
    tess_path = shutil.which("tesseract")
    if tess_path:
        pytesseract.pytesseract.tesseract_cmd = tess_path
        return True, f"Tesseract engine detected on PATH: {tess_path}"

    return False, (
        "Tesseract OCR executable (tesseract.exe) was not found on system PATH or standard directories. "
        "Scanned bitmap OCR is disabled until Tesseract-OCR is installed. "
        "Native digital PDF text extraction via PyMuPDF is fully operational."
    )


def calculate_sha256(data: bytes) -> str:
    """Calculates SHA-256 integrity hash strictly as a file-integrity identifier."""
    return hashlib.sha256(data).hexdigest()


def format_file_size(size_bytes: int) -> str:
    """Formats file size in KB or MB."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"


def validate_file_upload(filename: str, file_size: int) -> Tuple[bool, Optional[str]]:
    """Validates filename extension and maximum file size."""
    _, ext = os.path.splitext(filename)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"

    if file_size > MAX_FILE_SIZE_BYTES:
        return False, f"File size ({format_file_size(file_size)}) exceeds maximum allowed limit of 15 MB."

    return True, None


def extract_text_from_pdf(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Extracts text, metadata, and per-page structures from a PDF using PyMuPDF.
    """
    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) library is not installed.")

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_count = len(doc)
    full_text_pages: List[Dict[str, Any]] = []
    total_chars = 0

    for idx, page in enumerate(doc):
        text = page.get_text("text") or ""
        total_chars += len(text.strip())

        # Split into readable paragraphs
        paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 10]
        if not paragraphs and text.strip():
            paragraphs = [line.strip() for line in text.splitlines() if len(line.strip()) > 10]

        full_text_pages.append({
            "pageNumber": idx + 1,
            "text": text,
            "paragraphs": paragraphs,
        })

    is_scanned_likely = (total_chars < 80 and page_count > 0)

    doc_metadata = doc.metadata or {}
    doc.close()

    return {
        "pageCount": page_count,
        "pages": full_text_pages,
        "combinedText": "\n\n".join([p["text"] for p in full_text_pages]),
        "totalChars": total_chars,
        "isScannedLikely": is_scanned_likely,
        "producer": doc_metadata.get("producer", "Unknown"),
        "title": doc_metadata.get("title", "Untitled Document"),
    }


def extract_text_with_ocr(image_bytes: bytes) -> Tuple[str, bool, str]:
    """
    Attempts OCR on an image byte stream using Tesseract.
    Returns (extracted_text, ocr_success, status_message).
    Gracefully handles missing OCR engine.
    """
    has_tess, tess_msg = check_tesseract_engine_available()
    if not has_tess:
        return "", False, tess_msg

    try:
        import io
        img = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(img)
        return text, True, "OCR completed successfully using Tesseract-OCR."
    except Exception as e:
        return "", False, f"Tesseract OCR processing failed: {str(e)}"


def extract_key_fields_heuristic(text: str) -> Dict[str, Any]:
    """
    Extracts key regulatory and institutional fields from extracted document text.
    """
    fields: Dict[str, Any] = {}
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    for line in lines:
        line_l = line.lower()
        if "ref" in line_l and (":" in line or "no" in line_l) and "referenceNo" not in fields:
            fields["referenceNo"] = line.split(":")[-1].strip() if ":" in line else line
        elif "date" in line_l and ":" in line and "issueDate" not in fields:
            fields["issueDate"] = line.split(":")[-1].strip()
        elif "institution" in line_l and ":" in line and "institutionName" not in fields:
            fields["institutionName"] = line.split(":")[-1].strip()
        elif "cadre" in line_l and "cadreRatio" not in fields:
            fields["cadreMention"] = line
        elif "acre" in line_l or "sq.m" in line_l or "hectare" in line_l:
            fields["landAreaMention"] = line
        elif "aicte id" in line_l or "permanent id" in line_l:
            fields["aicteIdMention"] = line

    fields["extractedFieldCount"] = len(fields)
    return fields
