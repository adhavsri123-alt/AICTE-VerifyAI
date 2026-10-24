"""Near-duplicate text similarity screening using transparent token analysis."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Sequence

from app.models import Document, FindingReviewStatus, FindingSeverity
from app.services.anomaly.metadata_analyzer import AnomalyFinding


@dataclass
class SimilarityPairResult:
    """Outcome of pairwise text similarity comparison."""

    doc_a_id: str
    doc_b_id: str
    doc_a_filename: str
    doc_b_filename: str
    similarity_score: float
    common_token_count: int
    total_token_count: int
    is_near_duplicate: bool


def normalize_text_to_tokens(text: str | None) -> list[str]:
    """Normalize extracted document text into filtered, lowercase word tokens."""
    if not text or not isinstance(text, str):
        return []

    # Lowercase and replace non-alphanumeric characters with spaces
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    tokens = [t for t in cleaned.split() if len(t) > 1]
    return tokens


def compute_token_jaccard_similarity(tokens_a: Sequence[str], tokens_b: Sequence[str]) -> float:
    """Compute transparent Jaccard similarity coefficient between two token sequences.

    Returns a float between 0.0 (no overlap) and 1.0 (identical token sets).
    """
    set_a = set(tokens_a)
    set_b = set(tokens_b)

    if not set_a or not set_b:
        return 0.0

    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    if union == 0:
        return 0.0

    return round(intersection / union, 4)


class NearDuplicateDetector:
    """Screens extracted document text for high textual similarity while keeping exact duplicates distinct."""

    def __init__(self, threshold: float = 0.85, min_text_chars: int = 30) -> None:
        self.threshold = threshold
        self.min_text_chars = min_text_chars

    def check_near_duplicates(
        self,
        documents: list[Document],
        threshold: float | None = None,
    ) -> tuple[list[AnomalyFinding], list[SimilarityPairResult]]:
        """Screen all distinct document pairs within an application for near-duplicate text.

        Rules:
        1. Exact binary duplicates (matching SHA-256) are skipped here to keep exact and
           near-duplicates as distinct categories.
        2. A document is never compared against itself.
        3. Each unordered pair (doc_i, doc_j) is compared only once.
        4. Documents with empty or sparse extracted text (< min_text_chars) are safely skipped.
        """
        active_threshold = threshold if threshold is not None else self.threshold
        findings: list[AnomalyFinding] = []
        pair_results: list[SimilarityPairResult] = []

        doc_count = len(documents)
        for i in range(doc_count):
            for j in range(i + 1, doc_count):
                doc_a = documents[i]
                doc_b = documents[j]

                # Skip exact binary duplicates — already handled by SHA-256 detection
                if doc_a.sha256_hash and doc_b.sha256_hash and doc_a.sha256_hash == doc_b.sha256_hash:
                    continue

                text_a = doc_a.extracted_text or ""
                text_b = doc_b.extracted_text or ""

                if len(text_a.strip()) < self.min_text_chars or len(text_b.strip()) < self.min_text_chars:
                    continue

                tokens_a = normalize_text_to_tokens(text_a)
                tokens_b = normalize_text_to_tokens(text_b)

                if not tokens_a or not tokens_b:
                    continue

                similarity = compute_token_jaccard_similarity(tokens_a, tokens_b)
                is_near_dup = similarity >= active_threshold

                pair_res = SimilarityPairResult(
                    doc_a_id=doc_a.id,
                    doc_b_id=doc_b.id,
                    doc_a_filename=doc_a.original_filename,
                    doc_b_filename=doc_b.original_filename,
                    similarity_score=similarity,
                    common_token_count=len(set(tokens_a) & set(tokens_b)),
                    total_token_count=len(set(tokens_a) | set(tokens_b)),
                    is_near_duplicate=is_near_dup,
                )
                pair_results.append(pair_res)

                if is_near_dup:
                    finding = AnomalyFinding(
                        document_id=doc_a.id,
                        finding_code="DOCUMENT_NEAR_DUPLICATE",
                        severity=FindingSeverity.MEDIUM,
                        title=(
                            f"Near-Duplicate Content Detected: {doc_a.original_filename} & "
                            f"{doc_b.original_filename}"
                        ),
                        explanation=(
                            f"High textual similarity ({int(similarity * 100)}%) was detected between "
                            f"'{doc_a.original_filename}' and '{doc_b.original_filename}'. The text contains "
                            f"{pair_res.common_token_count} shared unique tokens. Note: Standard institutional "
                            f"boilerplate, identical legal templates, or repeated submissions often share substantial "
                            f"text; this finding is an advisory screening flag for manual comparison rather than "
                            f"evidence of fraud."
                        ),
                        evidence_reference=(
                            f"similarity_score: {similarity}, "
                            f"threshold: {active_threshold}, "
                            f"documents: ['{doc_a.id}', '{doc_b.id}'], "
                            f"filenames: ['{doc_a.original_filename}', '{doc_b.original_filename}'], "
                            f"common_tokens: {pair_res.common_token_count}, "
                            f"total_unique_tokens: {pair_res.total_token_count}"
                        ),
                        recommended_action=(
                            "Compare both documents side-by-side to verify whether they represent separate "
                            "distinct credentials or an accidental re-upload of a modified template."
                        ),
                        review_status=FindingReviewStatus.PENDING,
                    )
                    findings.append(finding)

        return findings, pair_results
