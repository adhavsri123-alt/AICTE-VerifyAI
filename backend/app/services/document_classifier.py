"""Extensible document classification registry and transparent keyword-based baseline."""

from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class DocumentCategory:
    """Definition of a document category in the registry."""

    key: str
    display_name: str
    description: str
    keywords: list[str] = field(default_factory=list)
    patterns: list[str] = field(default_factory=list)


# Central extensible registry of AICTE supporting document categories
DOCUMENT_REGISTRY: dict[str, DocumentCategory] = {
    "accreditation_certificate": DocumentCategory(
        key="accreditation_certificate",
        display_name="Accreditation Certificate",
        description="NAAC, NBA, or statutory body accreditation certificate.",
        keywords=[
            "naac",
            "nba",
            "accreditation",
            "grade",
            "cgpa",
            "national assessment and accreditation council",
            "national board of accreditation",
            "accredited",
            "validity period",
        ],
        patterns=[
            r"\bgrade\s*['\"]?[a-zA-Z\+]+['\"]?",
            r"\bcgpa\s*[:\=]?\s*[0-9]+(?:\.[0-9]+)?",
            r"\bcycle\s*[-–]\s*[1-4]\b",
        ],
    ),
    "faculty_record": DocumentCategory(
        key="faculty_record",
        display_name="Faculty Record",
        description="List of faculty, qualifications, appointments, and designations.",
        keywords=[
            "faculty",
            "assistant professor",
            "associate professor",
            "professor",
            "designation",
            "qualification",
            "department",
            "staff list",
            "teaching experience",
            "date of joining",
            "ph.d",
            "m.tech",
        ],
        patterns=[
            r"\b(?:asst\.?|assoc\.?|assistant|associate)?\s*professor\b",
            r"\bdate of joining\b",
        ],
    ),
    "noc_permission": DocumentCategory(
        key="noc_permission",
        display_name="Permission or NOC",
        description="State Government No Objection Certificate or University Affiliation letter.",
        keywords=[
            "no objection certificate",
            "noc",
            "permission",
            "affiliation",
            "state government",
            "directorate of technical education",
            "dte",
            "approval",
            "governing body",
            "university affiliation",
        ],
        patterns=[
            r"\bno\s+objection\s+certificate\b",
            r"\baffiliation\s+(?:order|letter|grant)\b",
        ],
    ),
    "affidavit_undertaking": DocumentCategory(
        key="affidavit_undertaking",
        display_name="Affidavit or Undertaking",
        description="Notarized affidavit or compliance undertaking on stamp paper.",
        keywords=[
            "affidavit",
            "undertaking",
            "solemnly affirm",
            "deponent",
            "oath",
            "notary",
            "stamp paper",
            "sworn",
            "verification",
            "indemnity",
        ],
        patterns=[
            r"\bsolemnly\s+affirm\b",
            r"\bbefore\s+me\s*,?\s*notary\b",
            r"\bdeponent\b",
        ],
    ),
    "payment_receipt": DocumentCategory(
        key="payment_receipt",
        display_name="Payment Receipt",
        description="AICTE regulatory / processing fee payment proof or transaction challan.",
        keywords=[
            "payment receipt",
            "transaction id",
            "receipt no",
            "challan",
            "utr number",
            "fee payment",
            "amount paid",
            "bank reference",
            "neft",
            "rtgs",
        ],
        patterns=[
            r"\b(?:utr|txn|transaction)\s*(?:no|id|number)?\s*[:\-]?\s*[a-zA-Z0-9]+",
            r"\binr\s*[0-9,]+(?:\.[0-9]{2})?",
        ],
    ),
    "infrastructure_evidence": DocumentCategory(
        key="infrastructure_evidence",
        display_name="Infrastructure Evidence",
        description="Land documents, occupancy certificates, floor plans, and lab equipment lists.",
        keywords=[
            "built up area",
            "carpet area",
            "land area",
            "sqm",
            "square meters",
            "laboratories",
            "classrooms",
            "library",
            "computer center",
            "infrastructure",
            "survey number",
            "khasra",
        ],
        patterns=[
            r"\b(?:built[\s\-]up|carpet|land)\s+area\b",
            r"\b[0-9]+(?:\.[0-9]+)?\s*sq(?:\.|\s*)m(?:eters?)?\b",
        ],
    ),
    "unclassified": DocumentCategory(
        key="unclassified",
        display_name="Other or Unclassified Document",
        description="General supporting document that does not strongly match specific categories.",
        keywords=[],
        patterns=[],
    ),
}


@dataclass
class ClassificationResult:
    """Result of document classification."""

    document_type: str
    display_name: str
    confidence: float | None
    matched_keywords: list[str]
    method: str = "keyword_heuristic_v1"


def classify_document_text(text: str) -> ClassificationResult:
    """Classify document text using transparent keyword and pattern matching.

    This baseline classifier counts keyword and regex pattern hits across each
    category in the registry. It is deliberately transparent and does not pretend
    to be a deep learning model.
    """
    if not text or len(text.strip()) < 15:
        return ClassificationResult(
            document_type="unclassified",
            display_name=DOCUMENT_REGISTRY["unclassified"].display_name,
            confidence=None,
            matched_keywords=[],
        )

    text_lower = text.lower()
    scores: dict[str, tuple[float, list[str]]] = {}

    for key, category in DOCUMENT_REGISTRY.items():
        if key == "unclassified":
            continue

        matched: list[str] = []
        score = 0.0

        for kw in category.keywords:
            if kw in text_lower:
                score += 1.0
                matched.append(kw)

        for pat in category.patterns:
            if re.search(pat, text_lower):
                score += 2.0  # Pattern matches carry higher weight

        if score > 0:
            scores[key] = (score, matched)

    if not scores:
        return ClassificationResult(
            document_type="unclassified",
            display_name=DOCUMENT_REGISTRY["unclassified"].display_name,
            confidence=None,
            matched_keywords=[],
        )

    # Pick the category with the highest score
    best_key, (best_score, best_matched) = max(scores.items(), key=lambda item: item[1][0])

    # Compute a normalized confidence score (bounded [0.4, 0.95] for heuristics)
    confidence = min(0.95, round(0.40 + (best_score * 0.10), 2))

    return ClassificationResult(
        document_type=best_key,
        display_name=DOCUMENT_REGISTRY[best_key].display_name,
        confidence=confidence,
        matched_keywords=best_matched,
    )
