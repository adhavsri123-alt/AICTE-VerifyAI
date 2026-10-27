"""
Document Processing & Text Extraction Pipeline
Supports:
1. PDF text extraction via PyMuPDF (fitz / pymupdf)
2. Scanned image extraction via Tesseract OCR with graceful fallback if tesseract.exe is unavailable
3. Hybrid fallback: Scanned PDF page image rendering + Tesseract OCR when native text is sparse
4. SHA-256 cryptographic file-integrity checksum calculation
5. Extracted field recognition (institution, reference numbers, dates, cadre, areas)
6. Regulatory rule checks integration
"""

import os
import io
import hashlib
import json
import shutil
import subprocess
import re
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
MAX_PDF_PAGES = 50                     # Guard against processing excessively large PDFs in memory


def _test_tesseract_executable(cmd_path: str) -> Tuple[bool, str]:
    """
    Safely executes `tesseract --version` to verify that the executable exists,
    has execute permissions, and runs without error on the host OS.
    """
    if not os.path.isfile(cmd_path):
        return False, f"File does not exist: {cmd_path}"

    try:
        res = subprocess.run(
            [cmd_path, "--version"],
            capture_output=True,
            text=True,
            timeout=4,
        )
        if res.returncode == 0:
            version_str = res.stdout.splitlines()[0] if res.stdout else "version verified"
            return True, version_str.strip()
        return False, f"Process exited with code {res.returncode}: {res.stderr.strip()}"
    except Exception as e:
        return False, str(e)


def check_tesseract_engine_available() -> Tuple[bool, str]:
    """
    Checks if the actual Tesseract OCR binary executable is available and operational.
    Checks:
      1. TESSERACT_CMD or TESSERACT_PATH environment variables.
      2. Standard Windows installation paths (handling spaces and quotes).
      3. System PATH via shutil.which.
    Returns (is_available, details_or_instruction_message).
    """
    if not HAS_PYTESSERACT_LIB:
        return False, (
            "pytesseract Python package is not installed. "
            "Install via: pip install pytesseract"
        )

    candidates: List[str] = []

    # 1. Environment variables (TESSERACT_CMD or TESSERACT_PATH)
    env_cmd = os.environ.get("TESSERACT_CMD") or os.environ.get("TESSERACT_PATH")
    if env_cmd:
        cleaned_env = env_cmd.strip().strip('"').strip("'")
        if os.path.isdir(cleaned_env):
            # If pointing to directory, check executable inside
            candidates.append(os.path.join(cleaned_env, "tesseract.exe"))
            candidates.append(os.path.join(cleaned_env, "tesseract"))
        else:
            candidates.append(cleaned_env)

    # 2. Common Windows installation locations
    windows_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Tesseract-OCR\tesseract.exe"),
        os.path.expandvars(r"%USERPROFILE%\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
        os.path.expandvars(r"%USERPROFILE%\AppData\Local\Tesseract-OCR\tesseract.exe"),
        os.path.expandvars(r"%USERPROFILE%\scoop\apps\tesseract\current\tesseract.exe"),
        r"C:\tools\tesseract\tesseract.exe",
    ]
    candidates.extend(windows_paths)

    # 3. Check system PATH
    which_tess = shutil.which("tesseract") or shutil.which("tesseract.exe")
    if which_tess:
        candidates.append(which_tess)

    # Verify candidates
    for p in candidates:
        if not p or not os.path.exists(p):
            continue
        valid, ver_info = _test_tesseract_executable(p)
        if valid:
            if pytesseract is not None:
                pytesseract.pytesseract.tesseract_cmd = p
            return True, f"Tesseract engine detected at {p} ({ver_info})"

    return False, (
        "Tesseract OCR executable (tesseract.exe) was not found on system PATH or configured directories. "
        "Scanned bitmap OCR is disabled until Tesseract-OCR is installed. "
        "To enable scanned document OCR on Windows:\n"
        "  1. Run: winget install UB-Mannheim.TesseractOCR\n"
        "     or download the installer from https://github.com/UB-Mannheim/tesseract/wiki\n"
        "  2. If installed in a non-standard location, configure:\n"
        "     set TESSERACT_CMD=C:\\Program Files\\Tesseract-OCR\\tesseract.exe\n"
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
    if not filename or not filename.strip():
        return False, "Filename cannot be empty."

    _, ext = os.path.splitext(filename)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"

    if file_size <= 0:
        return False, "Uploaded file is empty (0 bytes)."

    if file_size > MAX_FILE_SIZE_BYTES:
        return False, f"File size ({format_file_size(file_size)}) exceeds maximum allowed limit of 15 MB."

    return True, None


def extract_text_with_ocr(image_bytes: bytes) -> Tuple[str, bool, str]:
    """
    Attempts OCR on an image byte stream using Tesseract.
    Returns (extracted_text, ocr_success, status_message).
    Gracefully handles missing OCR engine, invalid images, or runtime failures.
    """
    if not image_bytes:
        return "", False, "Empty image byte stream provided."

    has_tess, tess_msg = check_tesseract_engine_available()
    if not has_tess:
        return "", False, tess_msg

    if not HAS_PYTESSERACT_LIB or pytesseract is None or Image is None:
        return "", False, "pytesseract or Pillow (PIL) library is not available."

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.load()  # Verify integrity and decode image data
        text = pytesseract.image_to_string(img)
        clean_text = text.strip()
        if not clean_text:
            return "", True, "OCR completed: image contains no detectable textual content."
        return clean_text, True, "OCR completed successfully using Tesseract-OCR."
    except Exception as e:
        return "", False, f"Tesseract OCR processing failed: {str(e)}"


def extract_text_from_pdf(
    pdf_bytes: bytes,
    enable_ocr_fallback: bool = True,
    max_pages: int = MAX_PDF_PAGES,
) -> Dict[str, Any]:
    """
    Extracts text, metadata, and per-page structures from a PDF.
    Pipeline:
      1. Uses PyMuPDF to extract native embedded text per page.
      2. If a page has sparse text (< 80 characters) and enable_ocr_fallback is True,
         renders that page to an image and runs Tesseract OCR if available.
      3. Merges text gracefully and records whether OCR was used.
    """
    if not pdf_bytes:
        raise ValueError("Cannot extract text from empty document (0 bytes).")

    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) library is not installed.")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise ValueError(f"Invalid or corrupted PDF file: {str(e)}")

    page_count = len(doc)
    if page_count == 0:
        doc.close()
        return {
            "pageCount": 0,
            "pages": [],
            "combinedText": "",
            "totalChars": 0,
            "isScannedLikely": False,
            "ocrUsed": False,
            "ocrStatus": "Empty PDF document with 0 pages.",
            "producer": "Unknown",
            "title": "Untitled Document",
        }

    full_text_pages: List[Dict[str, Any]] = []
    total_chars = 0
    pages_to_process = min(page_count, max_pages)

    # Check Tesseract availability once for the document
    has_tess, tess_msg = check_tesseract_engine_available() if enable_ocr_fallback else (False, "OCR disabled")
    doc_ocr_used = False
    ocr_applied_pages: List[int] = []

    for idx in range(pages_to_process):
        page = doc[idx]
        native_text = page.get_text("text") or ""
        trimmed_native = native_text.strip()
        page_char_count = len(trimmed_native)
        total_chars += page_char_count

        page_text = native_text
        page_ocr_applied = False

        # If page has sparse/no embedded text, attempt OCR fallback
        if page_char_count < 80 and enable_ocr_fallback and has_tess and HAS_PYTESSERACT_LIB:
            try:
                # Render page to 150 DPI image for OCR
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                ocr_text, ocr_ok, _ = extract_text_with_ocr(img_bytes)
                if ocr_ok and ocr_text.strip():
                    page_ocr_applied = True
                    doc_ocr_used = True
                    ocr_applied_pages.append(idx + 1)
                    if trimmed_native:
                        page_text = f"{trimmed_native}\n\n[OCR Extracted Text]:\n{ocr_text.strip()}"
                    else:
                        page_text = ocr_text.strip()
                    total_chars += len(ocr_text.strip())
            except Exception:
                # Keep native text if OCR rendering fails
                pass

        # Split into readable paragraphs
        paragraphs = [p.strip() for p in page_text.split("\n\n") if len(p.strip()) > 10]
        if not paragraphs and page_text.strip():
            paragraphs = [line.strip() for line in page_text.splitlines() if len(line.strip()) > 10]
        if not paragraphs and page_text.strip():
            paragraphs = [page_text.strip()]

        full_text_pages.append({
            "pageNumber": idx + 1,
            "text": page_text,
            "paragraphs": paragraphs,
            "ocrApplied": page_ocr_applied,
        })

    is_scanned_likely = (total_chars < 80 and page_count > 0)

    # Determine descriptive OCR status
    if doc_ocr_used:
        ocr_status = f"OCR applied successfully to page(s) {', '.join(map(str, ocr_applied_pages))} via Tesseract-OCR."
    elif is_scanned_likely:
        if not has_tess:
            ocr_status = (
                "Scanned or image-only PDF detected. "
                "Tesseract OCR is not installed or detected on this system, so scanned text could not be extracted. "
                "Visual inspection recommended."
            )
        else:
            ocr_status = "Scanned PDF processed with Tesseract OCR; no readable text detected."
    else:
        ocr_status = "Not required for digital PDF document (native text extracted via PyMuPDF)."

    doc_metadata = doc.metadata or {}
    doc.close()

    return {
        "pageCount": page_count,
        "pages": full_text_pages,
        "combinedText": "\n\n".join([p["text"] for p in full_text_pages if p["text"].strip()]),
        "totalChars": total_chars,
        "isScannedLikely": is_scanned_likely,
        "ocrUsed": doc_ocr_used,
        "ocrStatus": ocr_status,
        "producer": doc_metadata.get("producer", "Unknown"),
        "title": doc_metadata.get("title", "Untitled Document"),
    }


def extract_key_fields_heuristic(text: str) -> Dict[str, Any]:
    """
    Extracts key regulatory and institutional fields from extracted document text.
    Extracts structured fields using robust regex patterns:
      - institutionName: Institution or college legal name
      - surveyNumber: Land parcel survey / plot number (e.g. 48/2)
      - landArea: Declared campus acreage or metric area (e.g. 2.5 acres)
      - applicationId: Formal submission or AICTE application identifier
      - issuingAuthority: Competent issuing or certifying entity
      - issueDate: Formal document execution or issuance date
      - referenceNo: Reference / order / file identifier
      - cadreMention: Mention or declaration of faculty cadre ratio
    Prevents accidentally extracting explanatory footer sentences or notes as values.
    """
    fields: Dict[str, Any] = {}
    if not text or not text.strip():
        fields["extractedFieldCount"] = 0
        return fields

    lines = [l.strip() for l in text.splitlines() if l.strip()]

    # 1. Survey Number
    # Match patterns like: "Survey Number: 48/2", "Survey No: 48/2", "Sy. No: 48/2", "Khasra No: 48/2", "Plot No: 48/2"
    m_survey = re.search(
        r'(?:survey\s*(?:number|no\.?|#)?|sy\.?\s*(?:no\.?|#)?|khasra\s*(?:no\.?|#)?|plot\s*(?:no\.?|#)?)\s*[:=\-–]\s*([A-Za-z0-9/_\-\.]+)',
        text,
        re.IGNORECASE,
    )
    if m_survey:
        val = m_survey.group(1).strip().rstrip(".,;:").strip()
        if val and not re.match(r'^(?:is|are|of|the|and|or|in|to|for|with)$', val, re.IGNORECASE):
            fields["surveyNumber"] = val

    # 2. Land Area
    # Match patterns like: "Land Area: 2.5 acres", "Total Land Area: 2.5 acres", "Area of Land: 2.5 Acres", "Land: 2.5 acres"
    # MUST have an explicit label preceding separator, to avoid catching general footer notes.
    m_land = re.search(
        r'(?:total\s+)?(?:land\s+area|campus\s+area|site\s+area|area\s+of\s+land|extent\s+of\s+land|land)\s*[:=\-–]\s*(\d+(?:\.\d+)?\s*(?:acres?|hectares?|sq\.?\s*(?:m(?:eters?)?|ft|feet)|gunthas?|cents?))\b',
        text,
        re.IGNORECASE,
    )
    if m_land:
        val = m_land.group(1).strip()
        fields["landArea"] = val
        fields["landAreaMention"] = f"Land Area: {val}"
    else:
        # Check line-by-line fallback only if labeled, never accepting explanatory notes or footer text
        for line in lines:
            line_l = line.lower()
            if any(unit in line_l for unit in ["acre", "sq.m", "sq. m", "hectare"]):
                if any(kw in line_l for kw in ["note", "guideline", "regulation", "statutory", "allocat", "campus exceeding", "playground", "clause"]):
                    continue
                if any(kw in line_l for kw in ["land", "area", "extent"]) and (":" in line or "=" in line or "-" in line):
                    parts = re.split(r'[:=\-–]', line, maxsplit=1)
                    if len(parts) == 2:
                        val_candidate = parts[1].strip()
                        m_val = re.search(r'(\d+(?:\.\d+)?\s*(?:acres?|hectares?|sq\.?\s*(?:m(?:eters?)?|ft|feet)|gunthas?|cents?))\b', val_candidate, re.IGNORECASE)
                        if m_val:
                            fields["landArea"] = m_val.group(1).strip()
                            fields["landAreaMention"] = line
                            break

    # 3. Institution Name
    # Match: "Institution Name: Northstar Institute of Technology", "Institution: ...", "Name of the Institution: ..."
    m_inst = re.search(
        r'(?:institution(?:\s+name)?|name\s+of\s+(?:the\s+)?institution|college(?:\s+name)?)\s*[:=\-–]\s*([^\n\r,;]+)',
        text,
        re.IGNORECASE,
    )
    if m_inst:
        val = m_inst.group(1).strip().strip('"\'').rstrip(".,;:")
        if len(val) >= 3 and not val.lower().startswith(("under", "nil", "none", "n/a", "not applicable")):
            fields["institutionName"] = val

    # 4. Application ID
    # Match: "Application ID: DEMO/2026-27/EOA/TS/004812", "Application No: ...", "App ID: ..."
    m_app = re.search(
        r'(?:aicte\s+)?(?:application\s*(?:id|no\.?|number|#)?|app\s*id)\s*[:=\-–]\s*([A-Za-z0-9/_\-\.]+)',
        text,
        re.IGNORECASE,
    )
    if m_app:
        val = m_app.group(1).strip().rstrip(".,;:")
        if val:
            fields["applicationId"] = val
    else:
        m_app_pattern = re.search(r'\b(DEMO/\d{4}-\d{2}/[A-Z0-9/_\-]+)\b', text)
        if m_app_pattern:
            fields["applicationId"] = m_app_pattern.group(1).strip()

    # 5. Reference Number
    # Match: "Ref: AICTE/2026/NPA/KA/001842", "Reference No: ...", "File No: ..."
    m_ref = re.search(
        r'(?:ref(?:erence)?\s*(?:no\.?|number|#)?|file\s*no\.?|order\s*no\.?)\s*[:=\-–]\s*([^\n\r,;]+)',
        text,
        re.IGNORECASE,
    )
    if m_ref:
        val = m_ref.group(1).strip().strip('"\'').rstrip(".,;:")
        if val:
            fields["referenceNo"] = val

    # 6. Issuing Authority
    # Match: "Issuing Authority: Office of the Tahsildar", "Competent Authority: ...", "Registration Authority: ..."
    m_auth = re.search(
        r'(?:issuing\s+authority|competent\s+authority|registration\s+authority|issued\s+by)\s*[:=\-–]\s*([^\n\r;]+)',
        text,
        re.IGNORECASE,
    )
    if m_auth:
        val = m_auth.group(1).strip().strip('"\'').rstrip(".,;:")
        if len(val) >= 3:
            fields["issuingAuthority"] = val

    # 7. Issue Date
    # Match: "Issue Date: 2024-04-18", "Date of Issue: ...", "Dated: ...", "Date: 2026-10-12"
    m_date = re.search(
        r'(?:issue\s+date|date\s+of\s+issue|issuing\s+date|date)\s*[:=\-–]\s*(\d{1,4}[-/\.]\d{1,2}[-/\.]\d{2,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4})',
        text,
        re.IGNORECASE,
    )
    if m_date:
        val = m_date.group(1).strip().rstrip(".,;:")
        if val:
            fields["issueDate"] = val

    # 8. Cadre Mention & AICTE ID mention (for backwards compatibility)
    for line in lines:
        line_l = line.lower()
        if "cadre" in line_l and "cadreRatio" not in fields and "cadreMention" not in fields:
            fields["cadreMention"] = line
        elif ("aicte id" in line_l or "permanent id" in line_l) and "aicteIdMention" not in fields:
            fields["aicteIdMention"] = line

    # Compute extractedFieldCount strictly counting actual extracted key fields
    fields["extractedFieldCount"] = len([k for k in fields.keys() if k != "extractedFieldCount"])
    return fields
