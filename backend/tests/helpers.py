"""Test helpers for generating synthetic documents and images."""

from __future__ import annotations

import io
from PIL import Image, ImageDraw
import pymupdf


def create_synthetic_pdf(text: str = "AICTE Verification Test Document", pages: int = 1) -> bytes:
    """Generate a valid, text-based PDF in memory using PyMuPDF."""
    doc = pymupdf.open()
    for i in range(pages):
        page = doc.new_page()
        page.insert_text((50, 72), f"{text} (Page {i + 1})")
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_pdf_with_metadata(
    text: str = "AICTE Verification Test Document",
    metadata: dict | None = None,
) -> bytes:
    """Generate a synthetic PDF with custom metadata dict."""
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), text)
    if metadata:
        doc.set_metadata(metadata)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_pdf_with_timestamps(
    text: str = "AICTE Test Document",
    creation_date: str = "D:20250101120000Z",
    mod_date: str = "D:20250102120000Z",
    creator: str = "AICTE System",
    producer: str = "PyMuPDF",
    author: str = "",
    title: str = "",
) -> bytes:
    """Generate a synthetic PDF with controlled creator, producer, and timestamps."""
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), text)
    meta = {
        "creator": creator,
        "producer": producer,
        "creationDate": creation_date,
        "modDate": mod_date,
        "author": author,
        "title": title,
    }
    doc.set_metadata(meta)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_scanned_pdf() -> bytes:
    """Generate an image-only PDF containing no extractable text characters."""
    doc = pymupdf.open()
    page = doc.new_page()
    # Insert a blank image instead of text
    img = Image.new("RGB", (300, 200), color=(240, 240, 240))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    page.insert_image(pymupdf.Rect(50, 50, 350, 250), stream=buf.getvalue())
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_synthetic_png(text: str = "Test PNG") -> bytes:
    """Generate a valid PNG image in memory."""
    img = Image.new("RGB", (300, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((10, 40), text, fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_synthetic_jpeg(text: str = "Test JPEG") -> bytes:
    """Generate a valid JPEG image in memory."""
    img = Image.new("RGB", (300, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((10, 40), text, fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()
