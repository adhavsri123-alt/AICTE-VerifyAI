"""Private file storage service: persists files safely on the filesystem without exposing paths."""

from __future__ import annotations

import os
import uuid
from pathlib import Path


class FileStorageService:
    """Handles private file storage on the local filesystem."""

    def __init__(self, storage_dir: str = "./storage") -> None:
        self.storage_path = Path(storage_dir).resolve()
        self.storage_path.mkdir(parents=True, exist_ok=True)

    def save_file(self, content: bytes, extension: str) -> str:
        """Store file content under a unique UUID-based filename.

        Returns:
            The safe internal storage reference (e.g., '123e4567-e89b...pdf').
            Absolute paths are NEVER returned.
        """
        # Normalize extension
        ext = extension.lower()
        if not ext.startswith("."):
            ext = f".{ext}"

        safe_filename = f"{uuid.uuid4()}{ext}"
        target_path = self.storage_path / safe_filename

        # Write file atomically
        with open(target_path, "wb") as f:
            f.write(content)

        return safe_filename

    def get_absolute_path(self, storage_reference: str) -> Path:
        """Resolve a storage reference to an absolute filesystem Path safely.

        Verifies that the resolved path stays strictly within the storage directory
        to prevent path traversal attacks.
        """
        # Strip any leading slashes or directories
        clean_ref = os.path.basename(storage_reference.replace("\\", "/"))
        resolved = (self.storage_path / clean_ref).resolve()

        if not str(resolved).startswith(str(self.storage_path)):
            raise ValueError(f"Path traversal detected for storage reference: {storage_reference}")

        return resolved

    def read_file(self, storage_reference: str) -> bytes:
        """Read file bytes using the internal storage reference."""
        file_path = self.get_absolute_path(storage_reference)
        if not file_path.exists():
            raise FileNotFoundError(f"Stored file not found for reference: {storage_reference}")
        with open(file_path, "rb") as f:
            return f.read()

    def delete_file(self, storage_reference: str) -> bool:
        """Delete a stored file safely if it exists."""
        try:
            file_path = self.get_absolute_path(storage_reference)
            if file_path.exists():
                file_path.unlink()
                return True
        except Exception:
            pass
        return False
