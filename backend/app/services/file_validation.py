"""Secure file validation: extension, MIME type, file signatures, size limits, and sanitisation."""

from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass

from fastapi import HTTPException, status

# Supported file signatures (magic bytes)
_MAGIC_SIGNATURES: dict[str, list[bytes]] = {
    "application/pdf": [b"%PDF-"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/jpeg": [b"\xff\xd8\xff"],
}

_EXT_TO_MIME: dict[str, str] = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


@dataclass
class FileValidationResult:
    """Outcome of file validation."""

    sanitized_filename: str
    extension: str
    mime_type: str
    file_size: int
    sha256_hash: str


def sanitize_filename(filename: str | None) -> str:
    """Sanitize original filename to prevent path traversal, control characters, and unsafe paths."""
    if not filename:
        return "unnamed_document"

    # Strip any directory path components (both UNIX and Windows)
    clean = os.path.basename(filename.replace("\\", "/"))

    # Remove null bytes and control characters
    clean = re.sub(r"[\x00-\x1f\x7f]", "", clean)

    # Remove dangerous leading/trailing characters
    clean = clean.strip(" .")

    if not clean:
        return "unnamed_document"

    # Limit length to 255 characters
    return clean[:255]


def validate_file(
    content: bytes,
    filename: str | None,
    client_content_type: str | None,
    max_upload_size_bytes: int,
) -> FileValidationResult:
    """Validate uploaded file bytes, extension, MIME type, magic bytes, and size.

    Raises HTTPException with appropriate status codes on failure:
    - 400 for empty files, unsupported extensions, or signature mismatches.
    - 413 for oversized files.
    """
    file_size = len(content)

    # 1. Check for empty file
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty (0 bytes).",
        )

    # 2. Check maximum size
    if file_size > max_upload_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File size ({file_size} bytes) exceeds the maximum allowed "
                f"limit of {max_upload_size_bytes} bytes."
            ),
        )

    # 3. Sanitize filename and extract extension
    clean_name = sanitize_filename(filename)
    _, ext = os.path.splitext(clean_name)
    ext_lower = ext.lower()

    if ext_lower not in _EXT_TO_MIME:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file extension '{ext_lower}'. Allowed extensions are: "
                f"{', '.join(_EXT_TO_MIME.keys())}."
            ),
        )

    expected_mime = _EXT_TO_MIME[ext_lower]

    # 4. Validate file signature (magic bytes) - never trust client MIME alone
    valid_signature = False
    for signature in _MAGIC_SIGNATURES[expected_mime]:
        if content.startswith(signature):
            valid_signature = True
            break

    if not valid_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File signature mismatch. The content of '{clean_name}' does not match "
                f"the expected binary signature for {expected_mime}."
            ),
        )

    # 5. Calculate SHA-256 hash
    sha256_hash = hashlib.sha256(content).hexdigest()

    return FileValidationResult(
        sanitized_filename=clean_name,
        extension=ext_lower,
        mime_type=expected_mime,
        file_size=file_size,
        sha256_hash=sha256_hash,
    )
