"""Duplicate document detection via SHA-256 binary hash matching."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from app.models import Document, FindingReviewStatus, FindingSeverity


@dataclass
class DuplicateFinding:
    """Internal representation of a duplicate document finding."""

    finding_code: str
    severity: FindingSeverity
    title: str
    explanation: str
    evidence_reference: str
    recommended_action: str
    review_status: FindingReviewStatus = FindingReviewStatus.PENDING
    document_id: str | None = None


def check_duplicate_documents(
    documents: list[Document],
) -> tuple[list[DuplicateFinding], int]:
    """Identify documents within an application that share an identical SHA-256 hash.

    Returns:
        tuple: (findings, checks_completed)
    """
    findings: list[DuplicateFinding] = []
    checks_completed = len(documents)

    # Group documents by SHA-256 hash
    hash_groups: dict[str, list[Document]] = defaultdict(list)
    for doc in documents:
        if doc.sha256_hash:
            hash_groups[doc.sha256_hash].append(doc)

    for sha_hash, docs in hash_groups.items():
        if len(docs) > 1:
            filenames = [d.original_filename for d in docs]
            doc_ids = [d.id for d in docs]
            finding = DuplicateFinding(
                document_id=docs[0].id,
                finding_code="DUPLICATE_DOCUMENT_DETECTED",
                severity=FindingSeverity.MEDIUM,
                title="Duplicate File Content Uploaded",
                explanation=(
                    f"Identical file content was detected across {len(docs)} documents: "
                    f"{', '.join(filenames)}. Both files share the same SHA-256 cryptographic hash "
                    f"({sha_hash[:16]}...). Note: Identical file hashes indicate identical file contents, "
                    f"which frequently represents an accidental duplicate submission rather than fraud."
                ),
                evidence_reference=(
                    f"sha256: '{sha_hash}', "
                    f"document_ids: {doc_ids}, "
                    f"filenames: {filenames}"
                ),
                recommended_action=(
                    "Verify whether the duplicate upload was unintentional and replace with "
                    "the distinct required document if needed."
                ),
            )
            findings.append(finding)

    return findings, checks_completed
