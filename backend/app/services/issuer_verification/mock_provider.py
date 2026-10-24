"""Deterministic mock issuer verification provider with synthetic registry records."""

from __future__ import annotations

import re
from typing import Any

from app.services.issuer_verification.provider import (
    IssuerVerificationOutcome,
    IssuerVerificationRequest,
    IssuerVerificationResponse,
    VerificationProvider,
)


def _normalize_code(code: str | None) -> str:
    """Normalize a certificate reference number (strip whitespace, lowercase, remove dashes/spaces)."""
    if not code:
        return ""
    return re.sub(r"[\s\-_/]", "", code.lower())


def _normalize_name(name: str | None) -> str:
    """Normalize organization/institution name for tolerant comparison."""
    if not name:
        return ""
    cleaned = re.sub(r"[^\w\s]", " ", name.lower())
    # Expand common abbreviations
    cleaned = re.sub(r"\biit\b", "indian institute of technology", cleaned)
    cleaned = re.sub(r"\bnit\b", "national institute of technology", cleaned)
    return " ".join(cleaned.split())


class MockIssuerVerificationProvider(VerificationProvider):
    """Deterministic synthetic issuer verification provider for Hackathon demonstrations and testing.

    IMPORTANT SAFETY NOTICE:
    This provider uses synthetic test records only and operates entirely offline.
    It does NOT connect to real AICTE, government, university, or issuer systems.
    Outcomes labelled as MOCK_MATCH represent simulated test matches and must NEVER
    be treated as official legal or regulatory authentication.
    """

    # Synthetic registry of authorized test records
    SYNTHETIC_REGISTRY: dict[str, dict[str, Any]] = {
        _normalize_code("NOC-AICTE-2025-001"): {
            "reference_number": "NOC-AICTE-2025-001",
            "issuer_name": "State Higher Education Department, Maharashtra",
            "institution_name": "Indian Institute of Technology Bombay",
            "document_type": "noc_permission",
            "issue_date": "2025-01-15",
            "validity_date": "2028-01-15",
            "status": "active",
        },
        _normalize_code("NOC-AICTE-DELHI-002"): {
            "reference_number": "NOC-AICTE-DELHI-002",
            "issuer_name": "Directorate of Training and Technical Education, Delhi",
            "institution_name": "Indian Institute of Technology Delhi",
            "document_type": "noc_permission",
            "issue_date": "2025-02-01",
            "validity_date": "2027-02-01",
            "status": "active",
        },
        _normalize_code("AICTE-FEE-2025-99"): {
            "reference_number": "AICTE-FEE-2025-99",
            "issuer_name": "AICTE Regulatory Portal (SBI Payment Gateway)",
            "institution_name": "Indian Institute of Technology Bombay",
            "document_type": "payment_receipt",
            "issue_date": "2025-01-10",
            "status": "settled",
        },
        _normalize_code("AFF-NOTARY-2025-001"): {
            "reference_number": "AFF-NOTARY-2025-001",
            "issuer_name": "Government of India Notary Public",
            "institution_name": "Indian Institute of Technology Bombay",
            "document_type": "affidavit_undertaking",
            "issue_date": "2025-01-05",
            "status": "registered",
        },
        _normalize_code("PWD-INFR-2025-001"): {
            "reference_number": "PWD-INFR-2025-001",
            "issuer_name": "State Public Works Department",
            "institution_name": "Indian Institute of Technology Bombay",
            "document_type": "infrastructure_evidence",
            "issue_date": "2024-11-20",
            "status": "certified",
        },
        _normalize_code("NOC-ANNA-2025-77"): {
            "reference_number": "NOC-ANNA-2025-77",
            "issuer_name": "Anna University Affiliation Division",
            "institution_name": "Anna University Chennai",
            "document_type": "noc_permission",
            "issue_date": "2025-01-20",
            "validity_date": "2026-06-30",
            "status": "active",
        },
    }

    def __init__(self, available: bool = True) -> None:
        self._available = available

    @property
    def name(self) -> str:
        return "synthetic:mock_issuer_registry_v1"

    @property
    def is_mock(self) -> bool:
        return True

    @property
    def is_available(self) -> bool:
        return self._available

    def set_availability(self, available: bool) -> None:
        """Control simulated provider uptime for testing failure scenarios."""
        self._available = available

    def verify(self, request: IssuerVerificationRequest) -> IssuerVerificationResponse:
        """Evaluate issuer verification request against the synthetic test registry."""
        # 1. Provider Availability Guard
        if not self.is_available:
            return IssuerVerificationResponse(
                outcome=IssuerVerificationOutcome.UNAVAILABLE,
                provider_name=self.name,
                is_mock=True,
                is_officially_verified=False,
                explanation="The mock issuer verification service is currently offline or disabled in configuration.",
                evidence_reference="provider_status: 'offline', endpoint: 'synthetic_mock'",
                recommended_action="Check verification provider service health or retry later.",
                requires_human_review=True,
            )

        # 2. Extract key matching identifiers
        ref_num = (request.certificate_reference or "").strip()
        issuer = (request.issuer_name or "").strip()
        inst_name = (request.institution_name or "").strip()
        doc_type = (request.document_type or "").strip()

        # If reference number is not in top-level request, check extracted_fields
        if not ref_num and request.extracted_fields:
            ref_num = (
                request.extracted_fields.get("certificate_number")
                or request.extracted_fields.get("receipt_number")
                or request.extracted_fields.get("receipt_no")
                or request.extracted_fields.get("transaction_id")
                or ""
            ).strip()

        if not issuer and request.extracted_fields:
            issuer = (request.extracted_fields.get("issuing_authority") or "").strip()

        # 3. Guard against insufficient information
        if not ref_num and not issuer:
            return IssuerVerificationResponse(
                outcome=IssuerVerificationOutcome.INSUFFICIENT_INFORMATION,
                provider_name=self.name,
                is_mock=True,
                is_officially_verified=False,
                explanation=(
                    "Document lacks both an extracted certificate reference number and issuing authority name. "
                    "Issuer verification assistance cannot proceed without at least one verifiable identifier."
                ),
                evidence_reference=f"document_id: '{request.document_id}', extracted_fields: {list(request.extracted_fields.keys())}",
                recommended_action="Manually check document header or stamp for certificate/reference number and enter manually.",
                requires_human_review=True,
            )

        # 4. Lookup in synthetic registry by reference number
        norm_ref = _normalize_code(ref_num)
        record = self.SYNTHETIC_REGISTRY.get(norm_ref) if norm_ref else None

        if record:
            matched_fields: dict[str, str] = {
                "certificate_reference": record["reference_number"],
            }
            unmatched_fields: dict[str, Any] = {}

            # Check Institution Name match
            reg_inst = record.get("institution_name", "")
            if inst_name and reg_inst:
                norm_input_inst = _normalize_name(inst_name)
                norm_reg_inst = _normalize_name(reg_inst)
                if norm_input_inst == norm_reg_inst or norm_input_inst in norm_reg_inst or norm_reg_inst in norm_input_inst:
                    matched_fields["institution_name"] = reg_inst
                else:
                    unmatched_fields["institution_name"] = {
                        "extracted": inst_name,
                        "registry": reg_inst,
                    }

            # Check Document Type match
            reg_doc_type = record.get("document_type", "")
            if doc_type and reg_doc_type:
                if doc_type == reg_doc_type:
                    matched_fields["document_type"] = reg_doc_type
                else:
                    unmatched_fields["document_type"] = {
                        "extracted": doc_type,
                        "registry": reg_doc_type,
                    }

            # If there are critical discrepancies (institution or doc type mismatch)
            if unmatched_fields:
                unmatched_summary = ", ".join(f"{k} (expected '{v['registry']}', found '{v['extracted']}')" for k, v in unmatched_fields.items())
                return IssuerVerificationResponse(
                    outcome=IssuerVerificationOutcome.MISMATCH,
                    provider_name=self.name,
                    is_mock=True,
                    is_officially_verified=False,
                    matched_fields=matched_fields,
                    unmatched_fields=unmatched_fields,
                    explanation=(
                        f"Certificate reference '{record['reference_number']}' was located in the synthetic registry, "
                        f"but discrepancies were identified: {unmatched_summary}. This indicates the document details "
                        f"differ from the recorded issuance record."
                    ),
                    evidence_reference=f"matched: {matched_fields}, unmatched: {unmatched_fields}",
                    recommended_action="Examine whether the submitted certificate belongs to a different institution or application.",
                    requires_human_review=True,
                )

            # Clean match against synthetic registry
            return IssuerVerificationResponse(
                outcome=IssuerVerificationOutcome.MOCK_MATCH,
                provider_name=self.name,
                is_mock=True,
                is_officially_verified=False,
                matched_fields=matched_fields,
                unmatched_fields={},
                explanation=(
                    f"Document reference '{record['reference_number']}' matched an entry in the synthetic verification registry "
                    f"for issuer '{record['issuer_name']}'. Simulated issuer status: {record['status'].upper()}. "
                    f"Notice: This is a demonstration mock result and does NOT represent official statutory verification."
                ),
                evidence_reference=(
                    f"reference_number: '{record['reference_number']}', issuer: '{record['issuer_name']}', "
                    f"registered_institution: '{record['institution_name']}'"
                ),
                recommended_action="Reviewer may proceed with confidence assessment; verify physical seal if required.",
                requires_human_review=True,
            )

        # 5. Reference number provided but NOT found in registry
        if ref_num:
            return IssuerVerificationResponse(
                outcome=IssuerVerificationOutcome.NO_MATCH,
                provider_name=self.name,
                is_mock=True,
                is_officially_verified=False,
                matched_fields={},
                unmatched_fields={"certificate_reference": {"extracted": ref_num, "registry": "NOT_FOUND"}},
                explanation=(
                    f"Certificate reference number '{ref_num}' was not found in the synthetic issuer verification registry. "
                    f"Note: Absence from the mock demonstration registry does not imply the physical document is fraudulent; "
                    f"the mock registry only contains synthetic demo records."
                ),
                evidence_reference=f"searched_reference: '{ref_num}', provider: '{self.name}'",
                recommended_action="Perform manual issuer verification via official institutional portal or contact issuing office.",
                requires_human_review=True,
            )

        # 6. Only Issuer Name was provided without reference number
        return IssuerVerificationResponse(
            outcome=IssuerVerificationOutcome.MANUAL_REVIEW_REQUIRED,
            provider_name=self.name,
            is_mock=True,
            is_officially_verified=False,
            matched_fields={"issuer_name": issuer},
            unmatched_fields={},
            explanation=(
                f"Issuing authority '{issuer}' was recognized, but no certificate or reference number was extractable "
                f"to perform automated record cross-referencing."
            ),
            evidence_reference=f"issuer_name: '{issuer}', missing_field: 'certificate_reference'",
            recommended_action="Locate certificate or dispatch number on document scan and verify manually.",
            requires_human_review=True,
        )
