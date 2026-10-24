"""Structured field extraction from document text using heuristic regex patterns."""

from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class ExtractedFields:
    """Container for extracted structured fields with explicit None for missing values."""

    institution_name: str | None = None
    certificate_or_reference_number: str | None = None
    issue_date: str | None = None
    validity_or_expiry_date: str | None = None
    relevant_identifiers: dict[str, str] = field(default_factory=dict)
    field_confidences: dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "institution_name": self.institution_name,
            "certificate_or_reference_number": self.certificate_or_reference_number,
            "certificate_number": self.certificate_or_reference_number,
            "issue_date": self.issue_date,
            "validity_or_expiry_date": self.validity_or_expiry_date,
            "validity_date": self.validity_or_expiry_date,
            "issuing_authority": self.relevant_identifiers.get("issuing_authority"),
            "relevant_identifiers": self.relevant_identifiers,
            "field_confidences": self.field_confidences,
            "is_verified": False,
            "notice": (
                "These values are preliminary heuristic extractions from document text. "
                "They have NOT been independently verified or authenticated."
            ),
        }


def extract_structured_fields(text: str) -> ExtractedFields:
    """Extract structured fields from document text without fabricating missing data.

    Missing fields are explicitly kept as None.
    """
    if not text:
        return ExtractedFields()

    result = ExtractedFields()

    # 1. Institution Name
    # Priority A: Explicit label
    name_label_match = re.search(
        r"(?i)(?:name\s+of\s+(?:the\s+)?(?:institution|college|university|institute)|"
        r"institution\s+name|institute\s+name)\s*[:\-]\s*([^\n\r,;\.]+)",
        text,
    )
    if name_label_match:
        val = name_label_match.group(1).strip()
        if len(val) >= 3:
            result.institution_name = val
            result.field_confidences["institution_name"] = 0.85
    else:
        # Priority B: Recognizable institutional entity
        entity_match = re.search(
            r"\b((?:Indian\s+Institute\s+of\s+Technology|National\s+Institute\s+of\s+Technology|"
            r"Birla\s+Institute\s+of\s+Technology|[A-Z][a-zA-Z\s\&\.\-]{2,40}\s+"
            r"(?:Institute\s+of\s+Technology|Engineering\s+College|College\s+of\s+Engineering|"
            r"University|Polytechnic)))\b",
            text,
        )
        if entity_match:
            result.institution_name = entity_match.group(1).strip()
            result.field_confidences["institution_name"] = 0.70

    # 2. Certificate / Reference Number
    ref_match = re.search(
        r"(?i)\b(?:certificate|ref(?:erence)?|f|order|receipt|affiliation)\.?\s*(?:no\.?|number|\#)?\s*[:\-]\s*([A-Za-z0-9\/\-_\.]+)",
        text,
    )
    if ref_match:
        ref_val = ref_match.group(1).strip().rstrip(".")
        if len(ref_val) >= 3 and not re.match(r"^[0-9]{1,2}[\/\-][0-9]{1,2}$", ref_val):
            result.certificate_or_reference_number = ref_val
            result.field_confidences["certificate_or_reference_number"] = 0.80

    # 3. Issue Date
    date_regex = (
        r"([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|"
        r"[0-9]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+[0-9]{4})"
    )
    issue_match = re.search(
        rf"(?i)(?:date\s*(?:of\s*issue)?|dated|issued\s*on)\s*[:\-]?\s*{date_regex}",
        text,
    )
    if issue_match:
        result.issue_date = issue_match.group(1).strip()
        result.field_confidences["issue_date"] = 0.85
    else:
        # Standalone date fallback if labeled "Date:"
        standalone_date = re.search(rf"(?i)\bDate\s*[:\-]?\s*{date_regex}", text)
        if standalone_date:
            result.issue_date = standalone_date.group(1).strip()
            result.field_confidences["issue_date"] = 0.70

    # 4. Validity or Expiry Date
    validity_match = re.search(
        rf"(?i)(?:valid\s*(?:up\s*to|till|until|through)|validity(?:\s*period)?|"
        rf"expiry\s*date|valid\s*for\s*(?:academic\s*year)?)\s*[:\-]?\s*"
        rf"({date_regex}|[0-9]{4}\s*[-–]\s*[0-9]{2,4})",
        text,
    )
    if validity_match:
        result.validity_or_expiry_date = validity_match.group(1).strip()
        result.field_confidences["validity_or_expiry_date"] = 0.80

    # 5. Relevant Identifiers
    identifiers: dict[str, str] = {}

    # AICTE Application ID
    app_id_match = re.search(r"(?i)\b(?:aicte\s+)?application\s*id\s*[:\-]?\s*([0-9\-]+)\b", text)
    if app_id_match:
        identifiers["aicte_application_id"] = app_id_match.group(1).strip()

    # AICTE Permanent ID (typically 1-XXXXXXXXX)
    perm_id_match = re.search(r"(?i)\b(?:permanent\s*id|pid)\s*[:\-]?\s*([0-9\-]+)\b", text)
    if perm_id_match:
        identifiers["aicte_permanent_id"] = perm_id_match.group(1).strip()

    # AISHE Code (e.g. C-12345)
    aishe_match = re.search(r"(?i)\b(?:aishe\s*(?:code)?)\s*[:\-]?\s*([A-Za-z0-9\-]+)\b", text)
    if aishe_match:
        identifiers["aishe_code"] = aishe_match.group(1).strip()

    # UTR or Transaction reference
    utr_match = re.search(r"(?i)\b(?:utr(?:\s*number|\s*no)?|transaction\s*id)\s*[:\-]?\s*([A-Za-z0-9]+)\b", text)
    if utr_match:
        identifiers["transaction_or_utr"] = utr_match.group(1).strip()

    # Issuing Authority / Department
    authority_match = re.search(
        r"(?i)\b(?:issuing\s+authority|issued\s+by|authorized\s+by)\s*[:\-]\s*([^\n\r,;\.]+)",
        text,
    )
    if authority_match:
        identifiers["issuing_authority"] = authority_match.group(1).strip()

    result.relevant_identifiers = identifiers
    return result
