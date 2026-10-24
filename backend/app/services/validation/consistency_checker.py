"""Cross-document consistency validation service."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from app.models import Document, FindingReviewStatus, FindingSeverity


@dataclass
class ConsistencyFinding:
    """Internal representation of a cross-document consistency finding."""

    finding_code: str
    severity: FindingSeverity
    title: str
    explanation: str
    evidence_reference: str
    recommended_action: str
    review_status: FindingReviewStatus = FindingReviewStatus.PENDING
    document_id: str | None = None


# Expansion mapping for common technical education acronyms
_ACRONYM_EXPANSIONS: dict[str, str] = {
    r"\biit\b": "indian institute of technology",
    r"\bnit\b": "national institute of technology",
    r"\biiit\b": "indian institute of information technology",
    r"\bbits\b": "birla institute of technology and science",
    r"\bdtu\b": "delhi technological university",
    r"\bcoep\b": "college of engineering pune",
    r"\bdept\.?\b": "department",
    r"\binst\.?\b": "institute",
    r"\bcoll\.?\b": "college",
    r"\bengg\.?\b": "engineering",
    r"\btech\.?\b": "technology",
    r"\buniv\.?\b": "university",
}


def normalize_text(text: str | None) -> str:
    """Normalize institutional names and strings for fair, tolerant comparison.

    Normalizes case, accents, common abbreviations, punctuation, and whitespace.
    """
    if not text:
        return ""

    # 1. Lowercase and normalize unicode
    s = unicodedata.normalize("NFKD", text.lower())

    # 2. Expand common acronyms so 'IIT Bombay' matches 'Indian Institute of Technology Bombay'
    for pat, repl in _ACRONYM_EXPANSIONS.items():
        s = re.sub(pat, repl, s)

    # 3. Strip punctuation and symbols
    s = re.sub(r"[\.,\-–_–\(\)\[\]\{\}:;/\'\"\#]", " ", s)

    # 4. Collapse whitespace
    s = re.sub(r"\s+", " ", s).strip()
    return s


def are_names_consistent(name_a: str | None, name_b: str | None) -> bool:
    """Determine whether two institution names are substantially consistent.

    Returns True if exact match, substring match, or high token overlap is found.
    """
    norm_a = normalize_text(name_a)
    norm_b = normalize_text(name_b)

    if not norm_a or not norm_b:
        return False

    # Exact or substring containment
    if norm_a == norm_b or norm_a in norm_b or norm_b in norm_a:
        return True

    # Token overlap check (Jaccard similarity on non-stopwords)
    stopwords = {"of", "and", "the", "for", "in", "at", "campus"}
    tokens_a = {t for t in norm_a.split() if t not in stopwords}
    tokens_b = {t for t in norm_b.split() if t not in stopwords}

    if not tokens_a or not tokens_b:
        return False

    intersection = tokens_a & tokens_b
    union = tokens_a | tokens_b
    overlap_ratio = len(intersection) / len(union)

    return overlap_ratio >= 0.60


def check_cross_document_consistency(
    application_institution_name: str,
    documents: list[Document],
) -> tuple[list[ConsistencyFinding], int, int]:
    """Check consistency between application details and extracted document fields.

    Returns:
        tuple: (findings, checks_completed, checks_inconclusive)
    """
    findings: list[ConsistencyFinding] = []
    checks_completed = 0
    checks_inconclusive = 0

    docs_with_extracted_names: list[tuple[Document, str]] = []

    # 1. Compare each document against the application's declared institution name
    for doc in documents:
        fields = doc.extracted_fields or {}
        extracted_name = fields.get("institution_name")

        if not extracted_name or not str(extracted_name).strip():
            # Missing or unextracted value: report check could not be completed, do not invent mismatch
            checks_inconclusive += 1
            continue

        checks_completed += 1
        docs_with_extracted_names.append((doc, str(extracted_name).strip()))

        if not are_names_consistent(application_institution_name, str(extracted_name)):
            findings.append(
                ConsistencyFinding(
                    document_id=doc.id,
                    finding_code="INSTITUTION_NAME_MISMATCH",
                    severity=FindingSeverity.MEDIUM,
                    title=f"Institution Name Inconsistency: {doc.original_filename}",
                    explanation=(
                        f"The institution name declared in the application ('{application_institution_name}') "
                        f"does not match the institution name extracted from '{doc.original_filename}' "
                        f"('{extracted_name}'). Note: Minor spelling or campus variations are advisory "
                        f"discrepancies rather than confirmed invalidity."
                    ),
                    evidence_reference=(
                        f"application_name: '{application_institution_name}', "
                        f"document_name: '{extracted_name}', "
                        f"document_id: '{doc.id}'"
                    ),
                    recommended_action=(
                        "Verify whether the document corresponds to the applicant institution, "
                        "a sponsoring trust, or a branch campus."
                    ),
                )
            )

    # 2. Compare pairs of documents with extracted names to detect inter-document divergences
    for i in range(len(docs_with_extracted_names)):
        for j in range(i + 1, len(docs_with_extracted_names)):
            doc_a, name_a = docs_with_extracted_names[i]
            doc_b, name_b = docs_with_extracted_names[j]
            checks_completed += 1

            if not are_names_consistent(name_a, name_b):
                findings.append(
                    ConsistencyFinding(
                        document_id=doc_b.id,
                        finding_code="INTER_DOCUMENT_NAME_DIVERGENCE",
                        severity=FindingSeverity.MEDIUM,
                        title=f"Cross-Document Name Discrepancy",
                        explanation=(
                            f"Discrepancy detected between uploaded documents: '{doc_a.original_filename}' "
                            f"states '{name_a}', whereas '{doc_b.original_filename}' states '{name_b}'."
                        ),
                        evidence_reference=(
                            f"doc_a: '{doc_a.original_filename}' ('{name_a}'), "
                            f"doc_b: '{doc_b.original_filename}' ('{name_b}')"
                        ),
                        recommended_action="Ensure all submitted documents refer to the identical legal applicant entity.",
                    )
                )

    return findings, checks_completed, checks_inconclusive
