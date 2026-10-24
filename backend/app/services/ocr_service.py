"""OCR service using pytesseract and Pillow for images and scanned documents."""

from __future__ import annotations

import io
import os
import shutil
from dataclasses import dataclass

from PIL import Image

try:
    import pytesseract
    from pytesseract import Output
except ImportError:
    pytesseract = None
    Output = None


@dataclass
class OCRResult:
    """Outcome of an OCR operation."""

    text: str = ""
    confidence: float | None = None
    success: bool = False
    error_type: str | None = None  # 'missing_engine', 'corrupted_image', 'ocr_failed'
    error_message: str | None = None


class OCRService:
    """Manages optical character recognition for scanned PDFs and images."""

    def __init__(self, tesseract_cmd: str | None = None) -> None:
        self.tesseract_cmd = tesseract_cmd
        if self.tesseract_cmd and pytesseract:
            pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd

    def is_engine_available(self) -> bool:
        """Check whether the Tesseract OCR binary is reachable and operational."""
        if pytesseract is None:
            return False

        # If custom path was supplied
        if self.tesseract_cmd and os.path.exists(self.tesseract_cmd):
            return True

        # Check standard PATH
        if shutil.which("tesseract"):
            return True

        # Check default Windows paths
        default_win_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]
        for p in default_win_paths:
            if os.path.exists(p):
                pytesseract.pytesseract.tesseract_cmd = p
                return True

        # Test through pytesseract probe
        try:
            pytesseract.get_tesseract_version()
            return True
        except Exception:
            return False

    def extract_text(self, image_bytes: bytes) -> OCRResult:
        """Run OCR on image bytes (PNG or JPEG).

        Handles missing engine, corrupted images, and extraction errors gracefully.
        """
        # 1. Validate image format and bytes
        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()  # verify integrity
            # Reopen after verify() as Pillow documentation requires
            image = Image.open(io.BytesIO(image_bytes))
        except Exception as exc:
            return OCRResult(
                success=False,
                error_type="corrupted_image",
                error_message=f"Cannot decode or verify image bytes: {exc.__class__.__name__}",
            )

        # 2. Check OCR engine availability
        if not self.is_engine_available():
            return OCRResult(
                success=False,
                error_type="missing_engine",
                error_message=(
                    "Tesseract OCR engine is not installed or not found on PATH. "
                    "For Windows, install Tesseract OCR from UB-Mannheim "
                    "(https://github.com/UB-Mannheim/tesseract/wiki) and ensure "
                    "tesseract.exe is in PATH or configure TESSERACT_CMD in .env."
                ),
            )

        # 3. Perform OCR
        try:
            # Extract text
            text = pytesseract.image_to_string(image) or ""
            text = text.strip()

            # Attempt to compute average word confidence
            confidence = None
            try:
                data = pytesseract.image_to_data(image, output_type=Output.DICT)
                confs = [int(c) for c in data.get("conf", []) if isinstance(c, (int, str)) and str(c).isdigit() and int(c) >= 0]
                if confs:
                    confidence = round(sum(confs) / (len(confs) * 100.0), 3)
            except Exception:
                confidence = None

            return OCRResult(
                text=text,
                confidence=confidence,
                success=True,
            )

        except pytesseract.TesseractNotFoundError:
            return OCRResult(
                success=False,
                error_type="missing_engine",
                error_message=(
                    "Tesseract OCR binary not found on the host system. "
                    "Please install Tesseract OCR and configure PATH."
                ),
            )
        except Exception as exc:
            return OCRResult(
                success=False,
                error_type="ocr_failed",
                error_message=f"OCR execution failed: {exc.__class__.__name__}",
            )
