"""Configurable document checklists based on application category and academic year.

NOTE: These rules are synthetic illustrative examples configured for the Smart India Hackathon
demonstration. They illustrate how regulatory checklists function and do NOT claim to represent
official statutory AICTE approval process handbooks or legal regulations.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ChecklistRequirement:
    """A single document requirement within an application category checklist."""

    document_type: str
    display_name: str
    is_mandatory: bool
    description: str
    expected_fields: list[str] = field(default_factory=list)
    requires_expiry_date: bool = False


@dataclass
class ApplicationChecklist:
    """Complete document checklist for an application category."""

    category: str
    description: str
    requirements: list[ChecklistRequirement]
    is_synthetic: bool = True
    notice: str = (
        "Demonstration Checklist: Configured as an illustrative synthetic checklist "
        "for AICTE VerifyAI evaluation. Not official statutory AICTE requirements."
    )


# ---------------------------------------------------------------------------
# Illustrative Demonstration Checklists
# ---------------------------------------------------------------------------

_DEMO_CHECKLISTS: dict[str, ApplicationChecklist] = {
    "new institution": ApplicationChecklist(
        category="New Institution",
        description="Illustrative requirements for establishing a new technical institution.",
        requirements=[
            ChecklistRequirement(
                document_type="affidavit_undertaking",
                display_name="Affidavit or Undertaking",
                is_mandatory=True,
                description="Notarized compliance undertaking by the society/trust.",
                expected_fields=["institution_name"],
            ),
            ChecklistRequirement(
                document_type="noc_permission",
                display_name="Permission or NOC",
                is_mandatory=True,
                description="State Government NOC or University Affiliation letter.",
                expected_fields=["institution_name", "certificate_or_reference_number"],
                requires_expiry_date=True,
            ),
            ChecklistRequirement(
                document_type="infrastructure_evidence",
                display_name="Infrastructure Evidence",
                is_mandatory=True,
                description="Land and built-up area certificates.",
                expected_fields=["institution_name"],
            ),
            ChecklistRequirement(
                document_type="payment_receipt",
                display_name="Payment Receipt",
                is_mandatory=True,
                description="Proof of AICTE application and processing fee payment.",
                expected_fields=["certificate_or_reference_number"],
            ),
            ChecklistRequirement(
                document_type="faculty_record",
                display_name="Faculty Record",
                is_mandatory=False,
                description="Initial faculty roster (optional for initial application phase).",
                expected_fields=["institution_name"],
            ),
        ],
    ),
    "extension of approval": ApplicationChecklist(
        category="Extension of Approval",
        description="Illustrative requirements for annual extension of existing technical institution approval.",
        requirements=[
            ChecklistRequirement(
                document_type="faculty_record",
                display_name="Faculty Record",
                is_mandatory=True,
                description="Current faculty list with designations and qualifications.",
                expected_fields=["institution_name"],
            ),
            ChecklistRequirement(
                document_type="payment_receipt",
                display_name="Payment Receipt",
                is_mandatory=True,
                description="Annual regulatory approval fee receipt.",
                expected_fields=["certificate_or_reference_number"],
            ),
            ChecklistRequirement(
                document_type="affidavit_undertaking",
                display_name="Affidavit or Undertaking",
                is_mandatory=True,
                description="Annual compliance affidavit.",
                expected_fields=["institution_name"],
            ),
            ChecklistRequirement(
                document_type="accreditation_certificate",
                display_name="Accreditation Certificate",
                is_mandatory=False,
                description="NAAC/NBA accreditation certificate if applicable.",
                expected_fields=["validity_or_expiry_date"],
                requires_expiry_date=True,
            ),
        ],
    ),
    "introduction of new course": ApplicationChecklist(
        category="Introduction of New Course",
        description="Illustrative requirements for adding new courses or programs.",
        requirements=[
            ChecklistRequirement(
                document_type="noc_permission",
                display_name="Permission or NOC",
                is_mandatory=True,
                description="Affiliating University NOC for the specific new course.",
                expected_fields=["institution_name"],
                requires_expiry_date=True,
            ),
            ChecklistRequirement(
                document_type="infrastructure_evidence",
                display_name="Infrastructure Evidence",
                is_mandatory=True,
                description="Additional laboratory, library, and classroom proof.",
                expected_fields=["institution_name"],
            ),
            ChecklistRequirement(
                document_type="faculty_record",
                display_name="Faculty Record",
                is_mandatory=True,
                description="Faculty recruited with specialization in the new discipline.",
                expected_fields=["institution_name"],
            ),
            ChecklistRequirement(
                document_type="payment_receipt",
                display_name="Payment Receipt",
                is_mandatory=True,
                description="Course introduction processing fee receipt.",
                expected_fields=["certificate_or_reference_number"],
            ),
        ],
    ),
}

_DEFAULT_CHECKLIST = ApplicationChecklist(
    category="General Application",
    description="Default baseline checklist for general or unclassified application categories.",
    requirements=[
        ChecklistRequirement(
            document_type="affidavit_undertaking",
            display_name="Affidavit or Undertaking",
            is_mandatory=True,
            description="Institutional compliance affidavit.",
            expected_fields=["institution_name"],
        ),
        ChecklistRequirement(
            document_type="payment_receipt",
            display_name="Payment Receipt",
            is_mandatory=True,
            description="AICTE regulatory fee payment proof.",
            expected_fields=["certificate_or_reference_number"],
        ),
        ChecklistRequirement(
            document_type="noc_permission",
            display_name="Permission or NOC",
            is_mandatory=False,
            description="Relevant statutory permission or university order.",
            expected_fields=["institution_name"],
        ),
    ],
)


def get_checklist_for_application(
    category: str | None,
    academic_year: str | None = None,
) -> ApplicationChecklist:
    """Retrieve the checklist matching the application category and academic year.

    Falls back to a sensible default checklist if the category is not specifically matched.
    """
    if not category:
        return _DEFAULT_CHECKLIST

    cat_norm = category.strip().lower()

    # Exact key match
    if cat_norm in _DEMO_CHECKLISTS:
        return _DEMO_CHECKLISTS[cat_norm]

    # Partial / alias match
    if "extension" in cat_norm:
        return _DEMO_CHECKLISTS["extension of approval"]
    if "new institution" in cat_norm or "new institute" in cat_norm or "establishment" in cat_norm:
        return _DEMO_CHECKLISTS["new institution"]
    if "new course" in cat_norm or "program" in cat_norm:
        return _DEMO_CHECKLISTS["introduction of new course"]

    return _DEFAULT_CHECKLIST
