"""
Initial Database Seeder for VerifyAI SQLite Database.
Populates the database with the verified synthetic demo applications,
complete with AICTE statutory citations, document dossiers, and audit trails.
"""

import json
import os
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from .models import (
    InstitutionModel,
    SubmissionModel,
    FindingModel,
    EvidenceModel,
    ReviewerNoteModel,
    CrossDocComparisonModel,
    AuditEventModel,
    ReviewerModel,
)
from .auth import hash_password


def seed_reviewer_accounts(db: Session) -> None:
    """
    Ensure the demo reviewer account exists with a properly hashed password.
    The demo password is read from the VERIFYAI_DEMO_PASSWORD env var.
    If the var is not set, a safe development default is used.
    NEVER hardcode a production password here.
    """
    demo_password = os.environ.get("VERIFYAI_DEMO_PASSWORD", "VerifyAI@Demo2026")

    reviewers = [
        {
            "id": "rev-001",
            "email": "priya.venkataraman@aicte-verifyai.demo",
            "password_hash": hash_password(demo_password),
            "name": "Priya Venkataraman",
            "role": "Senior Compliance Reviewer",
            "avatar_initials": "PV",
            "assigned_count": 12,
            "resolved_this_month": 34,
            "is_active": True,
            "created_at": "2026-01-15T09:00:00Z",
        },
    ]

    for r in reviewers:
        existing = db.query(ReviewerModel).filter(ReviewerModel.id == r["id"]).first()
        if existing is None:
            db.add(ReviewerModel(**r))
            print(f"[VerifyAI Auth] Created reviewer account: {r['email']}")
        else:
            # Re-hash password in case the env var changed
            existing.password_hash = r["password_hash"]
            print(f"[VerifyAI Auth] Refreshed password hash for: {r['email']}")

    db.commit()


def seed_database_if_empty(db: Session, force: bool = False):
    count = db.query(SubmissionModel).count()
    if count >= 25 and not force:
        return

    print(f"[VerifyAI DB] Seeding 30 synthetic demo applications and statutory records (existing count: {count})...")

    # If updating from old seed, clean up cleanly
    if count > 0:
        db.query(AuditEventModel).delete()
        db.query(ReviewerNoteModel).delete()
        db.query(CrossDocComparisonModel).delete()
        db.query(EvidenceModel).delete()
        db.query(FindingModel).delete()
        db.query(SubmissionModel).delete()
        db.query(InstitutionModel).delete()
        db.commit()

    # Define 30 Institutions
    institutions_data = [
        ("inst-001", "Northstar Institute of Technology", "Bengaluru", "Karnataka", "college", "DEMO-KA-ENG-2015-88"),
        ("inst-002", "Zenith Institute of Engineering & Technology", "Pune", "Maharashtra", "college", "DEMO-MH-ENG-2008-11"),
        ("inst-003", "Apex Technical Academy", "Coimbatore", "Tamil Nadu", "college", "DEMO-TN-ENG-1994-41"),
        ("inst-004", "Horizon Institute of Technology", "New Delhi", "Delhi", "university", "DEMO-DL-ENG-2011-01"),
        ("inst-005", "Vanguard Institute of Engineering", "Jaipur", "Rajasthan", "university", "DEMO-RJ-ENG-2009-03"),
        ("inst-006", "Summit Institute of Technology", "Ahmedabad", "Gujarat", "deemed", "DEMO-GJ-ENG-2016-07"),
        ("inst-007", "Pinnacle Institute of Technology", "Kolkata", "West Bengal", "college", "DEMO-WB-ENG-2010-52"),
        ("inst-008", "Deccan College of Engineering & Research", "Hyderabad", "Telangana", "college", "DEMO-TS-ENG-2005-22"),
        ("inst-009", "Malabar Institute of Technology", "Kozhikode", "Kerala", "college", "DEMO-KL-ENG-2012-39"),
        ("inst-010", "Kalinga Academy of Technical Sciences", "Bhubaneswar", "Odisha", "university", "DEMO-OD-ENG-2007-15"),
        ("inst-011", "Shivalik Institute of Engineering & Technology", "Chandigarh", "Punjab", "college", "DEMO-PB-ENG-2014-63"),
        ("inst-012", "Bundelkhand Polytechnic Institute", "Jhansi", "Uttar Pradesh", "polytechnic", "DEMO-UP-POLY-2013-18"),
        ("inst-013", "Royal College of Architecture & Planning", "Bhopal", "Madhya Pradesh", "college", "DEMO-MP-ARCH-2018-04"),
        ("inst-014", "Brahmaputra Valley Technical Institute", "Guwahati", "Assam", "college", "DEMO-AS-ENG-2009-31"),
        ("inst-015", "Metro Institute of Management Studies", "Gurugram", "Haryana", "college", "DEMO-HR-MGT-2011-82"),
        ("inst-016", "Vidarbha Institute of Technology", "Nagpur", "Maharashtra", "college", "DEMO-MH-ENG-2004-55"),
        ("inst-017", "Cauvery College of Engineering", "Mysuru", "Karnataka", "college", "DEMO-KA-ENG-2013-19"),
        ("inst-018", "Thar Desert Technical University", "Jodhpur", "Rajasthan", "university", "DEMO-RJ-ENG-2017-09"),
        ("inst-019", "Coromandel Institute of Maritime Studies", "Chennai", "Tamil Nadu", "college", "DEMO-TN-ENG-2009-84"),
        ("inst-020", "Gomti Institute of Pharmacy & Allied Sciences", "Lucknow", "Uttar Pradesh", "college", "DEMO-UP-PHARM-2015-77"),
        ("inst-021", "Nilgiri Polytechnic College", "Ooty", "Tamil Nadu", "polytechnic", "DEMO-TN-POLY-1998-12"),
        ("inst-022", "Chanakya Management Academy", "Patna", "Bihar", "college", "DEMO-BR-MGT-2016-44"),
        ("inst-023", "Western Ghats Institute of Technology", "Mangaluru", "Karnataka", "college", "DEMO-KA-ENG-2010-73"),
        ("inst-024", "Sabarmati College of Engineering", "Surat", "Gujarat", "college", "DEMO-GJ-ENG-2008-88"),
        ("inst-025", "Vindhya Institute of Technology", "Indore", "Madhya Pradesh", "college", "DEMO-MP-ENG-2016-51"),
        ("inst-026", "Godavari Institute of Technical Studies", "Rajahmundry", "Andhra Pradesh", "college", "DEMO-AP-ENG-2015-19"),
        ("inst-027", "Rohtak College of Engineering", "Rohtak", "Haryana", "college", "DEMO-HR-ENG-2012-61"),
        ("inst-028", "Konkan Institute of Technology", "Ratnagiri", "Maharashtra", "college", "DEMO-MH-ENG-2014-38"),
        ("inst-029", "Siliguri Institute of Technology & Management", "Siliguri", "West Bengal", "college", "DEMO-WB-ENG-2011-29"),
        ("inst-030", "Capital Engineering College", "Dehradun", "Uttarakhand", "college", "DEMO-UK-ENG-2015-42"),
    ]

    inst_map = {}
    for i_id, name, city, state, itype, aicte_id in institutions_data:
        m = InstitutionModel(
            id=i_id,
            name=name,
            city=city,
            state=state,
            type=itype,
            aicte_id=aicte_id,
            is_synthetic_demo=True,
        )
        db.add(m)
        inst_map[i_id] = m
    db.flush()

    # Submissions definition (30 items matching frontend)
    submissions_meta = [
        ("sub-001", "DEMO/2026-27/NPA/KA/001842", "inst-001", "2026-10-12T09:15:00Z", "2026-10-24T14:30:00Z", "escalated", "New Program Approval — B.Tech AI & DS", "Priya Venkataraman", 91, "2026-11-05T00:00:00Z", "Critical doctoral qualification gap for proposed Associate Professor cadre; disputed GPU workstation inventory."),
        ("sub-002", "DEMO/2026-27/ACF/MH/003317", "inst-002", "2026-10-14T11:45:00Z", "2026-10-25T10:00:00Z", "under_review", "Annual Compliance Filing", "Priya Venkataraman", 68, "2026-11-15T00:00:00Z", "Tuition fee disclosure mismatch flagged during website automated crawl."),
        ("sub-003", "DEMO/2026-27/EXT/TN/007891", "inst-003", "2026-10-08T08:30:00Z", "2026-10-25T16:00:00Z", "approved", "Intake Extension — MBA (60 seats)", "Ramesh Iyer", 22, "2026-11-01T00:00:00Z", "All proformas verified; MBA intake expansion recommended for approval."),
        ("sub-004", "DEMO/2026-27/NPA/DL/002254", "inst-004", "2026-10-18T14:00:00Z", "2026-10-25T11:30:00Z", "pending_review", "New Program Approval — M.Tech Robotics", "Unassigned", 55, "2026-11-20T00:00:00Z", "Initial triage complete; pending reviewer assignment."),
        ("sub-005", "DEMO/2026-27/ACF/RJ/005502", "inst-005", "2026-10-10T10:00:00Z", "2026-10-24T16:00:00Z", "on_hold", "Annual Compliance Filing", "Sunita Sharma", 74, "2026-11-10T00:00:00Z", "Awaiting university affiliation renewal certificate and anti-ragging committee reconstitution."),
        ("sub-006", "DEMO/2026-27/NPA/GJ/009103", "inst-006", "2026-10-19T13:00:00Z", "2026-10-25T14:00:00Z", "pending_review", "New Program Approval — B.Des Interaction Design", "Unassigned", 41, "2026-11-25T00:00:00Z", "Awaiting initial automated syllabus and studio facility validation."),
        ("sub-007", "DEMO/2026-27/ACF/WB/006614", "inst-007", "2026-10-09T09:00:00Z", "2026-10-24T13:00:00Z", "rejected", "Annual Compliance Filing", "Ramesh Iyer", 15, "2026-10-28T00:00:00Z", "Application rejected: Persistent statutory financial audit non-compliance after three notice cycles."),
        ("sub-008", "DEMO/2026-27/EOA/TS/004812", "inst-008", "2026-10-11T10:20:00Z", "2026-10-25T11:00:00Z", "escalated", "Extension of Approval (EoA) — Engineering", "Priya Venkataraman", 88, "2026-11-04T00:00:00Z", "Escalated for senior legal review: Bank mortgage lien detected on campus parcel Survey No. 48/2."),
        ("sub-009", "DEMO/2026-27/EXT/KL/002341", "inst-009", "2026-10-13T12:00:00Z", "2026-10-25T15:20:00Z", "under_review", "Increase in Intake — B.Tech CSE (60 to 120)", "Sunita Sharma", 62, "2026-11-12T00:00:00Z", "Teacher Student Ratio computes to 1:24 vs mandated 1:20 under proposed 120-seat expansion."),
        ("sub-010", "DEMO/2026-27/EOA/OD/005118", "inst-010", "2026-10-07T11:00:00Z", "2026-10-24T18:00:00Z", "approved", "Extension of Approval (EoA) — All Programs", "Ramesh Iyer", 20, "2026-11-02T00:00:00Z", "All NAAC A++ and NBA accreditations valid; clean annual renewal approved."),
        ("sub-011", "DEMO/2026-27/NPA/PB/003890", "inst-011", "2026-10-17T09:30:00Z", "2026-10-25T13:45:00Z", "pending_review", "New Program Approval — B.Tech Data Analytics", "Unassigned", 48, "2026-11-18T00:00:00Z", "Broken grievance redressal URL flagged during intake crawl."),
        ("sub-012", "DEMO/2026-27/EXT/UP/004412", "inst-012", "2026-10-12T14:15:00Z", "2026-10-25T12:00:00Z", "on_hold", "Diploma in Electrical Engineering Extension", "Priya Venkataraman", 71, "2026-11-08T00:00:00Z", "Awaiting State Technical Education Board curriculum concurrence renewal order."),
        ("sub-013", "DEMO/2026-27/NPA/MP/001920", "inst-013", "2026-10-15T15:00:00Z", "2026-10-25T14:30:00Z", "under_review", "New Program Approval — B.Arch (40 seats)", "Sunita Sharma", 58, "2026-11-16T00:00:00Z", "Drafting studio floor area shortfall flagged against Council of Architecture norms."),
        ("sub-014", "DEMO/2026-27/EOA/AS/008819", "inst-014", "2026-10-06T10:00:00Z", "2026-10-24T17:00:00Z", "approved", "Annual Extension of Approval (EoA)", "Ramesh Iyer", 18, "2026-11-01T00:00:00Z", "Dossier scrutiny cleared; clean annual renewal recommended."),
        ("sub-015", "DEMO/2026-27/ACF/HR/007321", "inst-015", "2026-10-11T13:45:00Z", "2026-10-25T16:15:00Z", "escalated", "Annual Compliance Filing — PGDM", "Priya Venkataraman", 85, "2026-11-03T00:00:00Z", "Director doctoral qualification issued by foreign institution without AIU equivalence."),
        ("sub-016", "DEMO/2026-27/EOA/MH/002241", "inst-016", "2026-10-08T09:20:00Z", "2026-10-25T11:00:00Z", "approved", "Annual Extension of Approval", "Ramesh Iyer", 24, "2026-11-04T00:00:00Z", "Statutory financial returns and faculty ratios verified satisfactorily."),
        ("sub-017", "DEMO/2026-27/ACF/KA/003889", "inst-017", "2026-10-14T16:00:00Z", "2026-10-25T10:30:00Z", "under_review", "Annual Compliance Filing", "Sunita Sharma", 64, "2026-11-14T00:00:00Z", "Central computing facility has 82 operational PC terminals vs statutory minimum of 100."),
        ("sub-018", "DEMO/2026-27/NPA/RJ/001102", "inst-018", "2026-10-05T08:00:00Z", "2026-10-24T12:00:00Z", "rejected", "New Technical Campus Establishment", "Ramesh Iyer", 12, "2026-10-26T00:00:00Z", "Application rejected: Fire NOC revoked and non-contiguous land parcel exceed statutory limits."),
        ("sub-019", "DEMO/2026-27/ACF/TN/006122", "inst-019", "2026-10-20T10:45:00Z", "2026-10-25T11:00:00Z", "pending_review", "Annual Compliance Filing — Marine Engg", "Unassigned", 38, "2026-11-28T00:00:00Z", "Automated document ingestion complete; queued for technical scrutinizer."),
        ("sub-020", "DEMO/2026-27/ACF/UP/005510", "inst-020", "2026-10-13T14:00:00Z", "2026-10-25T14:40:00Z", "on_hold", "Annual Compliance — B.Pharm", "Sunita Sharma", 69, "2026-11-09T00:00:00Z", "PCI annual compliance certificate awaited from regulatory body."),
        ("sub-021", "DEMO/2026-27/EOA/TN/003418", "inst-021", "2026-10-09T11:20:00Z", "2026-10-24T15:30:00Z", "approved", "Extension of Approval — Diploma Courses", "Ramesh Iyer", 19, "2026-11-05T00:00:00Z", "Polytechnic annual extension approved; all workshops inspected and cleared."),
        ("sub-022", "DEMO/2026-27/ACF/BR/008129", "inst-022", "2026-10-18T16:00:00Z", "2026-10-25T12:30:00Z", "pending_review", "Annual Compliance Filing — MBA", "Unassigned", 45, "2026-11-22T00:00:00Z", "Minor website ICC disclosure discrepancy noted."),
        ("sub-023", "DEMO/2026-27/EXT/KA/004921", "inst-023", "2026-10-14T10:00:00Z", "2026-10-25T16:00:00Z", "under_review", "Intake Extension — B.Tech ECE (60 seats)", "Priya Venkataraman", 60, "2026-11-13T00:00:00Z", "Advanced VLSI test bench calibration certificates requested from applicant."),
        ("sub-024", "DEMO/2026-27/EOA/GJ/003310", "inst-024", "2026-10-09T13:30:00Z", "2026-10-24T16:45:00Z", "approved", "Annual Extension of Approval", "Ramesh Iyer", 25, "2026-11-06T00:00:00Z", "Engineering programs cleared with continuous NAAC accreditation."),
        ("sub-025", "DEMO/2026-27/NPA/MP/002298", "inst-025", "2026-10-06T14:00:00Z", "2026-10-24T11:00:00Z", "rejected", "New Program Approval — B.Tech Civil", "Ramesh Iyer", 14, "2026-10-27T00:00:00Z", "Rejected: Inauthentic municipal occupancy certificate detected during civic ledger verification."),
        ("sub-026", "DEMO/2026-27/NPA/AP/007712", "inst-026", "2026-10-21T11:30:00Z", "2026-10-25T13:00:00Z", "pending_review", "New Program Approval — B.Tech Cyber Security", "Unassigned", 39, "2026-11-26T00:00:00Z", "Cybersecurity curriculum and lab network isolation dossier in review queue."),
        ("sub-027", "DEMO/2026-27/ACF/HR/001929", "inst-027", "2026-10-13T10:15:00Z", "2026-10-25T15:00:00Z", "on_hold", "Annual Compliance Filing", "Sunita Sharma", 72, "2026-11-11T00:00:00Z", "Awaiting certified bank salary disbursement statements for Q1 and Q2."),
        ("sub-028", "DEMO/2026-27/ACF/MH/004819", "inst-028", "2026-10-16T14:30:00Z", "2026-10-25T11:15:00Z", "under_review", "Annual Compliance Filing", "Priya Venkataraman", 56, "2026-11-17T00:00:00Z", "Campus leased line bandwidth shows 80 Mbps vs 100 Mbps mandatory quota."),
        ("sub-029", "DEMO/2026-27/EOA/WB/006190", "inst-029", "2026-10-08T11:00:00Z", "2026-10-24T14:00:00Z", "approved", "Annual Extension of Approval", "Ramesh Iyer", 21, "2026-11-05T00:00:00Z", "Technical and management streams cleared without deficiency."),
        ("sub-030", "DEMO/2026-27/NPA/UK/003821", "inst-030", "2026-10-20T15:00:00Z", "2026-10-25T14:00:00Z", "pending_review", "New Program Approval — B.Tech Artificial Intelligence", "Unassigned", 44, "2026-11-27T00:00:00Z", "Emerging technology proposal queued for Expert Scrutiny Committee assignment."),
    ]

    for s_id, app_id, i_id, sub_at, up_at, status, cat, ass_to, score, due, notes in submissions_meta:
        sub = SubmissionModel(
            id=s_id,
            application_id=app_id,
            institution_id=i_id,
            submitted_at=sub_at,
            updated_at=up_at,
            status=status,
            category=cat,
            assigned_to=ass_to,
            priority_score=score,
            due_date=due,
            review_notes=notes,
            is_synthetic_demo=True,
        )
        db.add(sub)
    db.flush()

    # Findings for Sub-001 (Northstar)
    f1a = FindingModel(
        id="fnd-001a",
        submission_id="sub-001",
        severity="critical",
        category="Faculty Cadre & Doctoral Ratio",
        description="Cadre imbalance: Proposed department lacks required domain-relevant doctoral qualifications for core cadre posts (Dr. P. Sangeetha Ph.D. is in Mechanical Engineering).",
        flagged_at="2026-10-18T11:00:00Z",
        rule_or_check="AICTE Approval Process Handbook (APH) 2024–2027, §6.14 and Annexure 5.2 (UG Engineering & Technology Cadre 1:2:6 & Domain Relevance)",
        reason="Under AICTE APH 2024–2027 §6.14 and Annexure 5.2, Professor and Associate Professor posts strictly require an awarded Ph.D. in the relevant discipline. Dr. Sangeetha's doctorate is in Mechanical Engineering, leaving the proposed AI & DS department deficient in mandated doctoral computing leadership.",
        document_id="ev-001c",
        document_name="DEMO_Faculty_Dossier_Northstar_AI_DS.pdf",
        page_number=3,
        highlight_snippet_id="snip-faculty-01",
        reviewer_next_step="Issue formal clarification query requiring submission of computing doctoral award certificates or consider provisional restriction of intake to 30 seats.",
        status_notice="Awaiting human reviewer decision",
        finding_type="rule_violation",
    )
    f1b = FindingModel(
        id="fnd-001b",
        submission_id="sub-001",
        severity="major",
        category="Lab Inventory Reconciliation (Synthetic Demo Rule)",
        description="Submitted GPU lab inventory declaration (30 workstations) mismatches physical on-site inspection (16 verified operational; 14 unaccounted for).",
        flagged_at="2026-10-19T09:30:00Z",
        rule_or_check="Synthetic demo rule: Institutional Lab Specification & Inventory Reconciliation (Referenced alongside AICTE APH 2024–2027 §6.19 / Annexure 4)",
        reason="Physical serial-number audit by Expert Visit Committee in Room CS-302 verified only 16 operational workstation units against proforma declaration of 30 specialized workstations without delivery challans.",
        document_id="ev-001b",
        document_name="DEMO_EVC_Physical_Inspection_Report_Northstar.pdf",
        page_number=2,
        highlight_snippet_id="snip-infra-01",
        reviewer_next_step="Request OEM purchase orders, delivery challans, and physical asset register for the 14 unaccounted workstations in Room CS-302.",
        status_notice="Awaiting documentary reconciliation",
        finding_type="inconsistent_information",
    )
    f1c = FindingModel(
        id="fnd-001c",
        submission_id="sub-001",
        severity="minor",
        category="Entity Legal Identity Reconciliation",
        description="Entity name discrepancy: Land conveyance deed (1998) cites 'Northstar Technical Institute' vs 2026 application 'Northstar Institute of Technology'.",
        flagged_at="2026-10-21T16:00:00Z",
        rule_or_check="AICTE Approval Process Handbook (APH) 2024–2027, §6.17 and Annexure 1 (Land Requirements, Lawful Title & Encumbrance Status)",
        reason="The 1998 registered title deed was executed in favor of 'Northstar Technical Institute'. A certified copy of the trust resolution confirming legal transition to 'Northstar Institute of Technology' is required.",
        document_id="ev-001e",
        document_name="DEMO_Registered_Land_Conveyance_Deed_Northstar.pdf",
        page_number=1,
        highlight_snippet_id="snip-legal-01",
        reviewer_next_step="Verify certified copy of trust resolution confirming entity continuity before final approval issuance.",
        status_notice="Inconclusive pending trust resolution submission",
        finding_type="inconsistent_information",
    )

    # Findings for other high-risk & flagged cases
    f2a = FindingModel(
        id="fnd-002a",
        submission_id="sub-002",
        severity="major",
        category="Tuition Fee Disclosure",
        description="Tuition fee adjustment not published on public portal 60 days prior as prescribed under mandatory disclosure guidelines.",
        flagged_at="2026-10-20T13:00:00Z",
        rule_or_check="AICTE Mandatory Public Disclosure Norms §3.8",
        finding_type="rule_violation",
    )
    f5a = FindingModel(
        id="fnd-005a",
        submission_id="sub-005",
        severity="critical",
        category="Affiliation Validity",
        description="State university affiliation renewal certificate not uploaded for current academic calendar.",
        flagged_at="2026-10-16T10:00:00Z",
        rule_or_check="AICTE APH 2024–2027 Chapter I (Affiliation Prerequisites)",
        finding_type="missing_information",
    )
    f5b = FindingModel(
        id="fnd-005b",
        submission_id="sub-005",
        severity="major",
        category="Anti-Ragging Committee",
        description="Mandatory external police/NGO representative missing from committee constitution proforma.",
        flagged_at="2026-10-17T14:00:00Z",
        rule_or_check="AICTE Regulations for Prevention and Prohibition of Ragging §6.3",
        finding_type="rule_violation",
    )
    f7a = FindingModel(
        id="fnd-007a",
        submission_id="sub-007",
        severity="critical",
        category="Statutory Financial Audit",
        description="Statutory audit report for prior financial year not submitted; persistent reporting non-compliance.",
        flagged_at="2026-10-15T10:00:00Z",
        rule_or_check="AICTE APH 2024–2027 Chapter II (Financial Viability & Annual Returns)",
        finding_type="rule_violation",
    )
    f8a = FindingModel(
        id="fnd-008a",
        submission_id="sub-008",
        severity="critical",
        category="Land Title & Encumbrance Status",
        description="Encumbrance Certificate reveals unrecorded commercial bank mortgage lien on campus parcel Survey No. 48/2.",
        flagged_at="2026-10-17T11:30:00Z",
        rule_or_check="AICTE APH 2024–2027 §6.17 & Annexure 1 (Lawful Freehold Land Possession)",
        finding_type="inconsistent_information",
    )
    f8b = FindingModel(
        id="fnd-008b",
        submission_id="sub-008",
        severity="major",
        category="Instructional Built-Up Area Shortfall",
        description="Physical inspection verifies instructional carpet area 18% below prescribed AICTE norms.",
        flagged_at="2026-10-19T14:15:00Z",
        rule_or_check="AICTE APH 2024–2027 Annexure 2 (Instructional Area Standards)",
        finding_type="rule_violation",
    )
    f9a = FindingModel(
        id="fnd-009a",
        submission_id="sub-009",
        severity="major",
        category="Faculty Student Ratio",
        description="Teacher Student Ratio computes to 1:24 vs mandated 1:20 under proposed 120-seat expansion.",
        flagged_at="2026-10-21T09:45:00Z",
        rule_or_check="AICTE APH 2024–2027 §6.14 and Annexure 5.2",
        finding_type="rule_violation",
    )
    f12a = FindingModel(
        id="fnd-012a",
        submission_id="sub-012",
        severity="major",
        category="State Technical Board Concurrence",
        description="UP Board of Technical Education curriculum concurrence order expired August 2026.",
        flagged_at="2026-10-18T16:00:00Z",
        rule_or_check="AICTE APH 2024–2027 §2.4",
        finding_type="missing_information",
    )
    f13a = FindingModel(
        id="fnd-013a",
        submission_id="sub-013",
        severity="major",
        category="Architecture Studio Floor Norms",
        description="Architecture drafting studio space declared at 120 sq.m vs prescribed minimum of 160 sq.m.",
        flagged_at="2026-10-21T11:00:00Z",
        rule_or_check="Council of Architecture & AICTE Guidelines §4.2",
        finding_type="rule_violation",
    )
    f15a = FindingModel(
        id="fnd-015a",
        submission_id="sub-015",
        severity="critical",
        category="Director Statutory Qualification",
        description="Director doctoral qualification issued by unaccredited foreign institution without AIU equivalence certificate.",
        flagged_at="2026-10-18T15:20:00Z",
        rule_or_check="AICTE APH 2024–2027 §6.14 & AIU Equivalence Requirements",
        finding_type="rule_violation",
    )
    f17a = FindingModel(
        id="fnd-017a",
        submission_id="sub-017",
        severity="major",
        category="Computing Infrastructure Quota",
        description="Central computer center contains 82 operational PC terminals vs statutory minimum of 100 PCs.",
        flagged_at="2026-10-22T14:30:00Z",
        rule_or_check="AICTE APH 2024–2027 §6.19 and Annexure 4",
        finding_type="rule_violation",
    )
    f18a = FindingModel(
        id="fnd-018a",
        submission_id="sub-018",
        severity="critical",
        category="Fire Safety NOC Clearance",
        description="Municipal Chief Fire Officer revoked provisional fire NOC due to lack of secondary emergency exits.",
        flagged_at="2026-10-12T09:00:00Z",
        rule_or_check="National Building Code NBC 2016 Part 4 & AICTE §6.17",
        finding_type="rule_violation",
    )
    f18b = FindingModel(
        id="fnd-018b",
        submission_id="sub-018",
        severity="critical",
        category="Non-Contiguous Land Parcels",
        description="Campus land parcel split across two revenue villages with 2.8 km aerial separation.",
        flagged_at="2026-10-14T11:00:00Z",
        rule_or_check="AICTE APH 2024–2027 §6.17",
        finding_type="rule_violation",
    )
    f20a = FindingModel(
        id="fnd-020a",
        submission_id="sub-020",
        severity="major",
        category="Pharmacy Council Statutory Inspection Order",
        description="Pharmacy Council of India (PCI) annual compliance certificate awaited from regulatory desk.",
        flagged_at="2026-10-20T15:00:00Z",
        rule_or_check="AICTE & PCI Harmonized Framework §3.2",
        finding_type="missing_information",
    )
    f23a = FindingModel(
        id="fnd-023a",
        submission_id="sub-023",
        severity="major",
        category="Laboratory Calibration Certification",
        description="Advanced VLSI and Microwave test benches lack mandatory ISO-17025 annual calibration certificates.",
        flagged_at="2026-10-21T14:00:00Z",
        rule_or_check="AICTE APH 2024–2027 Annexure 4",
        finding_type="missing_information",
    )
    f25a = FindingModel(
        id="fnd-025a",
        submission_id="sub-025",
        severity="critical",
        category="Municipal Occupancy Certificate Authenticity",
        description="Municipal occupancy certificate number (MCO-2024-8819) does not exist in Indore Municipal Corporation registered ledger.",
        flagged_at="2026-10-15T12:00:00Z",
        rule_or_check="AICTE APH 2024–2027 §6.17",
        finding_type="potential_anomaly",
    )
    f27a = FindingModel(
        id="fnd-027a",
        submission_id="sub-027",
        severity="major",
        category="Faculty Salary Bank Disbursement",
        description="Certified bank salary disbursement certificate missing for Q1 and Q2 of current calendar year.",
        flagged_at="2026-10-19T11:45:00Z",
        rule_or_check="AICTE APH 2024–2027 Chapter II",
        finding_type="missing_information",
    )

    db.add_all([
        f1a, f1b, f1c, f2a, f5a, f5b, f7a, f8a, f8b, f9a,
        f12a, f13a, f15a, f17a, f18a, f18b, f20a, f23a, f25a, f27a
    ])

    # Evidence for Sub-001 (Northstar Dossier)
    ev1a_content = {
        "documentId": "ev-001a",
        "headerTitle": "[SAMPLE / DEMO] GOVERNMENT OF KARNATAKA — HIGHER EDUCATION DEPARTMENT",
        "subHeader": "Directorate of Technical Education · No Objection Certificate (NOC) Proforma",
        "referenceNo": "ED/DTE/NOC/2024/BLR-0198",
        "issueDate": "12 October 2024",
        "issuingAuthority": "Directorate of Technical Education, Bengaluru",
        "sealText": "GOVERNMENT OF KARNATAKA · TECHNICAL EDUCATION SECRETARIAT",
        "pages": [
            {
                "pageNumber": 1,
                "paragraphs": [
                    {
                        "id": "p-noc-1",
                        "text": "1. STATE CLEARANCE: The Government of Karnataka conveys 'No Objection' for introduction of B.Tech in Artificial Intelligence & Data Science with an annual intake of sixty (60) seats at Northstar Institute of Technology, Knowledge Park, Whitefield Extension, Bengaluru.",
                        "isDiscrepancy": False,
                    },
                    {
                        "id": "p-noc-2",
                        "text": "2. REGULATORY CONDITIONALITY: This clearance is strictly subject to adherence to AICTE Approval Process Handbook (APH) 2024–2027 statutory provisions, including prescribed Faculty Cadre ratios (1:2:6) and mandatory doctoral qualifications under §6.14.",
                        "isDiscrepancy": False,
                    },
                ],
            }
        ],
    }

    ev1b_content = {
        "documentId": "ev-001b",
        "headerTitle": "[SAMPLE / DEMO] EXPERT VISIT COMMITTEE (EVC) — REGIONAL INSPECTION RECORD",
        "subHeader": "Physical On-Site Inspection & Computational Infrastructure Audit — DEMO PROFORMA",
        "referenceNo": "DEMO/AICTE/EVC-REP/2026/KA-0423/88",
        "issueDate": "18 October 2026",
        "issuingAuthority": "Expert Visit Committee Panel (Simulated Evaluation Record)",
        "sealText": "SAMPLE / DEMO PROFORMA · Physical Infrastructure Audit Form 4-EVC",
        "pages": [
            {
                "pageNumber": 1,
                "paragraphs": [
                    {
                        "id": "p-evc-p1-1",
                        "text": "1. INSPECTION MANDATE: The Expert Visit Committee conducted physical verification of Northstar Institute of Technology campus, Knowledge Park, Whitefield Extension, Bengaluru on Monday, 18th October 2026 for physical infrastructure verification.",
                        "isDiscrepancy": False,
                    },
                    {
                        "id": "p-evc-p1-2",
                        "text": "2. INFRASTRUCTURE ASSESSMENT: The committee inspected instructional spaces, computing laboratories, digital library servers, barrier-free access elevators, and power backup installations.",
                        "isDiscrepancy": False,
                    },
                ],
            },
            {
                "pageNumber": 2,
                "paragraphs": [
                    {
                        "id": "snip-infra-01",
                        "findingId": "fnd-001b",
                        "text": "3. COMPUTING LABORATORY DISCREPANCY (SYNTHETIC DEMO VALIDATION RULE): In Room CS-302, the self-disclosure declared thirty (30) specialized workstations equipped with high-performance GPUs. Physical on-site serial audit verified only sixteen (16) operational units. Fourteen (14) workstations were neither installed nor present in stores; lab superintendent cited vendor delay without furnishing verified delivery challans. [Rule Grounding: Evaluated under Synthetic Demo Validation Rule for institutional self-declaration reconciliation; AICTE statutory norms under APH 2024–2027 §6.19 and Annexure 4 prescribe departmental lab minimums of 20 PCs, centralized computer centre minimums of 100 PCs, and legal system/application software, rather than specific GPU hardware mandates].",
                        "isDiscrepancy": True,
                        "highlightSeverity": "major",
                        "annotationTitle": "Synthetic Demo Rule: GPU Lab Inventory Discrepancy (14 units unaccounted for)",
                        "fieldKey": "HPC Laboratory Inventory",
                    },
                    {
                        "id": "p-evc-p2-2",
                        "text": "4. INTAKE RECOMMENDATION: In view of the specialized compute shortfall and pending doctoral cadre review, the EVC recommends restricting provisional introductory intake to 30 seats.",
                        "isDiscrepancy": False,
                    },
                ],
            },
        ],
    }

    ev1c_content = {
        "documentId": "ev-001c",
        "headerTitle": "[SAMPLE / DEMO] HIGHER EDUCATION SCRUTINY CELL — STATE AFFILIATION BOARD",
        "subHeader": "Faculty Qualification Dossier & Cadre Scrutiny (B.Tech AI & Data Science) — DEMO PROFORMA",
        "referenceNo": "DEMO/VTU/FAC-QUAL/2026-27/AI-881",
        "issueDate": "12 October 2026",
        "issuingAuthority": "Academic Scrutiny Committee (Simulated Evaluation Record)",
        "sealText": "SAMPLE / DEMO PROFORMA · Technical Education Verification Cell",
        "pages": [
            {
                "pageNumber": 1,
                "paragraphs": [
                    {
                        "id": "p-fac-p1-1",
                        "text": "1. PREAMBLE: The applicant institution, Northstar Institute of Technology, has submitted an application for introductory sanction of intake for 60 seats in B.Tech Artificial Intelligence & Data Science under the Faculty of Engineering & Technology.",
                        "isDiscrepancy": False,
                    },
                    {
                        "id": "p-fac-p1-2",
                        "text": "2. STATUTORY CADRE REQUIREMENT: Under AICTE Approval Process Handbook (APH) 2024–2027 §6.14 and Annexure 5 (specifically Annexure 5.2: Faculty Cadre and Qualifications for Degree Engineering and Technology), for an approved intake of 60 students in Under Graduate Degree Engineering, the prescribed teacher-student ratio is 1:20 with a cadre ratio of Professor : Associate Professor : Assistant Professor = 1 : 2 : 6. Mandatory awarded doctoral degrees (Ph.D.) apply to Professor and Associate Professor posts.",
                        "isDiscrepancy": False,
                    },
                ],
            },
            {
                "pageNumber": 2,
                "paragraphs": [
                    {
                        "id": "p-fac-p2-1",
                        "text": "3. SUBMITTED FACULTY SUMMARY: The institution submitted biodata, identity tokens, and qualification certificates for eight (8) proposed full-time teaching faculty for the introductory academic cycles.",
                        "isDiscrepancy": False,
                    },
                    {
                        "id": "p-fac-p2-2",
                        "text": "4. VERIFICATION OF QUALIFICATIONS: Primary verification against educational repository records was conducted on 12-10-2026.",
                        "isDiscrepancy": False,
                    },
                ],
            },
            {
                "pageNumber": 3,
                "paragraphs": [
                    {
                        "id": "snip-faculty-01",
                        "findingId": "fnd-001a",
                        "text": "5. DOCTORAL QUALIFICATION DISCREPANCY: Scrutiny reveals that among proposed senior cadre posts, only 3 of the designated faculty hold awarded Ph.D. degrees. Dr. P. Sangeetha's thesis titled 'Dynamic Thermal Dissipation in High-Pressure Mechanical Turbines' (awarded 2018) reflects specialization in Mechanical Engineering rather than Computing/Data Sciences. Under AICTE APH 2024–2027 §6.14 and Annexure 5.2, specialized programmes require domain-relevant doctoral qualifications for core Professor and Associate Professor cadre positions.",
                        "isDiscrepancy": True,
                        "highlightSeverity": "critical",
                        "annotationTitle": "Critical Cadre & Ph.D. Norm Shortfall",
                        "fieldKey": "Faculty Doctoral Ratio",
                    },
                    {
                        "id": "p-fac-p3-2",
                        "text": "6. INSTITUTIONAL UNDERTAKING: The Principal has appended an undertaking stating that two Assistant Professors have submitted their Ph.D. theses and await viva-voce examination in December 2026.",
                        "isDiscrepancy": False,
                    },
                    {
                        "id": "p-fac-p3-3",
                        "text": "7. RECOMMENDATION: The Scrutiny Committee places this matter under CONDITIONAL ESCALATION pending submission of domain-specific doctoral award certificates or induction of qualified faculty.",
                        "isDiscrepancy": False,
                    },
                ],
            },
        ],
    }

    ev1d_content = {
        "documentId": "ev-001d",
        "headerTitle": "[SAMPLE / DEMO] CHARTERED ACCOUNTANT STATUTORY AUDIT REPORT",
        "subHeader": "Balance Sheet & Financial Solvency Certification — FY 2025–26",
        "referenceNo": "CA/AUD/2026/KA-8812",
        "issueDate": "13 October 2026",
        "issuingAuthority": "Statutory Auditor Desk (Simulated)",
        "sealText": "INSTITUTE OF CHARTERED ACCOUNTANTS OF INDIA · UDIN VERIFIED",
        "pages": [
            {
                "pageNumber": 1,
                "paragraphs": [
                    {
                        "id": "p-fin-1",
                        "text": "1. CORPUS VERIFICATION: We have audited the accompanying financial statements of Northstar Educational Trust. As of 31 March 2026, the Trust maintains unencumbered fixed deposit corpus of INR 12.80 Crores earmarked for institutional development.",
                        "isDiscrepancy": False,
                    },
                    {
                        "id": "p-fin-2",
                        "text": "2. STATUTORY COMPLIANCE: The institution satisfies the minimum financial viability and capital fund provisions prescribed under AICTE APH Chapter I norms.",
                        "isDiscrepancy": False,
                    },
                ],
            }
        ],
    }

    ev1e_content = {
        "documentId": "ev-001e",
        "headerTitle": "[SAMPLE / DEMO] SUB-REGISTRAR REVENUE TITLE CONVEYANCE DEED",
        "subHeader": "Registered Land Conveyance Deed & Revenue Schedule — DEMO PROFORMA",
        "referenceNo": "BLR/SR/BOOK-I/1998/VOL-412/P-88",
        "issueDate": "12 October 2026",
        "issuingAuthority": "Sub-Registrar Office, Bengaluru East",
        "sealText": "DEPARTMENT OF STAMPS AND REGISTRATION · GOVERNMENT OF KARNATAKA",
        "pages": [
            {
                "pageNumber": 1,
                "paragraphs": [
                    {
                        "id": "snip-legal-01",
                        "findingId": "fnd-001c",
                        "text": "1. TITLE CONVEYANCE & ENTITY NAME: This indenture executed on 14th August 1998 conveys contiguous agricultural land admeasuring 23.0 Acres in Survey Nos. 34/1, 34/2, and 35/B in favor of 'Northstar Technical Institute'. Note: 2026 regulatory application is filed under the modernized nomenclature 'Northstar Institute of Technology'. [Rule Grounding: AICTE APH 2024–2027 §6.17 and Annexure 1 require clear registered marketable title in the name of the applicant entity without ambiguity].",
                        "isDiscrepancy": True,
                        "highlightSeverity": "minor",
                        "annotationTitle": "Entity Title Discrepancy (Northstar Technical Institute vs Northstar Institute of Technology)",
                        "fieldKey": "Entity Name Reconciliation",
                    },
                    {
                        "id": "p-land-2",
                        "text": "2. ENCUMBRANCE STATUS: The property is free from all encumbrances, charges, mortgage liens, or pending revenue litigation as corroborated by Form 15 Nil-Encumbrance Certificate.",
                        "isDiscrepancy": False,
                    },
                ],
            }
        ],
    }

    ev1a = EvidenceModel(
        id="ev-001a",
        submission_id="sub-001",
        type="approval_letter",
        name="State Government NOC",
        uploaded_at="2026-10-12T09:20:00Z",
        verification_status="verified",
        issuer="State Technical Directorate (Simulated)",
        notes="State NOC cleared for 60 seats subject to AICTE Council approval",
        description="State Government No Objection Certificate issued by the Directorate of Technical Education.",
        filename="DEMO_State_Govt_NOC_Karnataka_Northstar.pdf",
        file_size_bytes=1840000,
        file_size_formatted="1.8 MB",
        checksum_sha256="5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
        page_count=1,
        content_json=json.dumps(ev1a_content),
    )
    ev1b = EvidenceModel(
        id="ev-001b",
        submission_id="sub-001",
        type="inspection_report",
        name="Expert Committee Physical Inspection Report",
        uploaded_at="2026-10-18T14:00:00Z",
        verification_status="disputed",
        issuer="Expert Inspection Panel (Simulated)",
        notes="On-site inventory audit noted 14 GPU workstations missing from Room CS-302",
        description="Official physical inspection report by appointed AICTE Expert Visit Committee.",
        filename="DEMO_EVC_Physical_Inspection_Report_Northstar.pdf",
        file_size_bytes=4210000,
        file_size_formatted="4.0 MB",
        checksum_sha256="3e7a1b9f2c8d4e5f6a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
        page_count=2,
        content_json=json.dumps(ev1b_content),
    )
    ev1c = EvidenceModel(
        id="ev-001c",
        submission_id="sub-001",
        type="document",
        name="Faculty Qualification Dossier & Ph.D. Certificates",
        uploaded_at="2026-10-12T09:25:00Z",
        verification_status="disputed",
        issuer="Educational Scrutiny Desk (Simulated)",
        notes="Cadre ratio deficiency flagged for Associate Professor post.",
        description="Comprehensive faculty biodata roster and doctoral certificates for proposed AI & DS cadre.",
        filename="DEMO_Faculty_Dossier_Northstar_AI_DS.pdf",
        file_size_bytes=8740200,
        file_size_formatted="8.3 MB",
        checksum_sha256="9f8b4e2d7c1a89f3b5e4d2c1a89f7b6e5d4c3b2a19f8e7d6c5b4a3f2e1d0c9b8",
        page_count=3,
        content_json=json.dumps(ev1c_content),
    )
    ev1d = EvidenceModel(
        id="ev-001d",
        submission_id="sub-001",
        type="financial_report",
        name="Audited Financial Statement FY 2025–26",
        uploaded_at="2026-10-13T10:00:00Z",
        verification_status="verified",
        issuer="Statutory Auditor Desk (Simulated)",
        notes="Statutory corpus reserves verified at INR 12.80 Crores",
        description="Statutory chartered accountant report on balance sheet and fixed deposits.",
        filename="DEMO_Audited_Financial_Statement_Northstar.pdf",
        file_size_bytes=3420000,
        file_size_formatted="3.3 MB",
        checksum_sha256="7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
        page_count=1,
        content_json=json.dumps(ev1d_content),
    )
    ev1e = EvidenceModel(
        id="ev-001e",
        submission_id="sub-001",
        type="document",
        name="Registered Land Conveyance Deed Extract",
        uploaded_at="2026-10-12T09:30:00Z",
        verification_status="verified",
        issuer="Land Title Registry Desk (Simulated)",
        notes="Land contiguous 23 Acres verified; name alias requires gazette reconciliation",
        description="Certified extract of the registered land conveyance deed and revenue schedule.",
        filename="DEMO_Registered_Land_Conveyance_Deed_Northstar.pdf",
        file_size_bytes=6150000,
        file_size_formatted="5.9 MB",
        checksum_sha256="b4a8e2f1c9d03e5a7b6c8d1f2a3e4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
        page_count=1,
        content_json=json.dumps(ev1e_content),
    )
    db.add_all([ev1a, ev1b, ev1c, ev1d, ev1e])

    # Reviewer Notes for Sub-001
    rn1 = ReviewerNoteModel(
        id="note-001",
        submission_id="sub-001",
        author="Priya Venkataraman",
        role="Senior Compliance Reviewer",
        timestamp="2026-10-24T10:15:00Z",
        text="Escalated to Senior Hearing Committee. The doctoral domain gap in AI/DS cadre requires official committee decision per APH §6.14.",
        category="faculty",
    )
    rn2 = ReviewerNoteModel(
        id="note-002",
        submission_id="sub-001",
        author="Dr. Anand Joshi",
        role="Regional Scrutiny Officer",
        timestamp="2026-10-25T11:45:00Z",
        text="On-site EVC noted missing 14 workstations in CS-302. Institution principal stated OEM delivery was delayed. Requested purchase orders and delivery challans.",
        category="infrastructure",
    )
    db.add_all([rn1, rn2])

    # Cross doc comparisons for Sub-001 (Multi-parameter reconciliation)
    cd1 = CrossDocComparisonModel(
        id="cdc-001",
        submission_id="sub-001",
        field_name="Specialized Computing Hardware Count",
        description="Self-declared high-performance GPU workstations vs on-site physical count",
        has_discrepancy=True,
        status_text="Discrepancy (14 Units Unaccounted)",
        entries_json=json.dumps([
            {"documentName": "Institutional Proforma Part B", "documentType": "Self-Declaration", "extractedValue": "30 Units (NVIDIA RTX A6000)", "sourcePage": 14, "isMismatched": True, "confidenceScore": 0.98},
            {"documentName": "EVC Physical Inspection Report", "documentType": "Expert Visit Audit", "extractedValue": "16 Operational Units (Room CS-302)", "sourcePage": 2, "isMismatched": True, "confidenceScore": 0.96},
        ]),
        human_review_recommendation="Seek purchase invoices and delivery challans for the 14 unverified workstations before granting program approval.",
    )
    cd2 = CrossDocComparisonModel(
        id="cdc-002",
        submission_id="sub-001",
        field_name="Institution Legal Entity Name",
        description="Entity legal title comparison across submitted statutory deeds, state approvals, and regulatory filing.",
        has_discrepancy=True,
        status_text="Discrepancy Flagged for Human Review",
        entries_json=json.dumps([
            {"documentName": "AICTE Online Application Form (2026–27 Demo)", "documentType": "Regulatory Application", "extractedValue": "Northstar Institute of Technology", "sourcePage": 1, "isMismatched": False, "confidenceScore": 0.99},
            {"documentName": "State Government NOC", "documentType": "State Government NOC", "extractedValue": "Northstar Institute of Technology, Knowledge Park, Whitefield Extension", "sourcePage": 1, "isMismatched": False, "confidenceScore": 0.98},
            {"documentName": "Registered Land Conveyance Deed Extract", "documentType": "Land Revenue Title", "extractedValue": "Northstar Technical Institute", "sourcePage": 1, "isMismatched": True, "confidenceScore": 0.94},
        ]),
        human_review_recommendation="Reconcile entity title between 1998 Land Deed ('Northstar Technical Institute') and 2026 AICTE Application ('Northstar Institute of Technology'). Verify that a formal Government gazette renaming order or trust deed amendment is on record.",
    )
    cd3 = CrossDocComparisonModel(
        id="cdc-003",
        submission_id="sub-001",
        field_name="Campus Land Area & Survey Coordinates",
        description="Physical campus land extent and survey numbers across revenue deed, municipal NOC, and application.",
        has_discrepancy=False,
        status_text="Concordant Across 3 Documents",
        entries_json=json.dumps([
            {"documentName": "AICTE Online Application Form (2026–27 Demo)", "documentType": "Regulatory Application", "extractedValue": "23.0 Acres (Survey Nos. 34/1, 34/2, 35/B)", "sourcePage": 4, "isMismatched": False, "confidenceScore": 0.99},
            {"documentName": "Registered Land Conveyance Deed Extract", "documentType": "Land Revenue Title", "extractedValue": "23.0 Acres (Survey Nos. 34/1, 34/2, 35/B, Bengaluru East)", "sourcePage": 1, "isMismatched": False, "confidenceScore": 0.98},
            {"documentName": "State Government NOC", "documentType": "State Government NOC", "extractedValue": "23.0 Acres Educational Complex, Knowledge Park", "sourcePage": 1, "isMismatched": False, "confidenceScore": 0.98},
        ]),
        human_review_recommendation="All 3 statutory instruments corroborate contiguous 23.0 Acres in Survey Nos. 34/1, 34/2, and 35/B.",
    )
    cd4 = CrossDocComparisonModel(
        id="cdc-004",
        submission_id="sub-001",
        field_name="Proposed AI & DS Student Intake",
        description="Sanctioned student intake declared by applicant versus expert inspection recommendation.",
        has_discrepancy=True,
        status_text="Intake Divergence Flagged",
        entries_json=json.dumps([
            {"documentName": "AICTE Online Application Form (2026–27 Demo)", "documentType": "Regulatory Application", "extractedValue": "60 Seats (Single Division / Shift 1)", "sourcePage": 2, "isMismatched": False, "confidenceScore": 1.0},
            {"documentName": "State Government NOC", "documentType": "State Government NOC", "extractedValue": "No Objection for 60 Seats (Subject to AICTE)", "sourcePage": 1, "isMismatched": False, "confidenceScore": 0.99},
            {"documentName": "Expert Committee Physical Inspection Report", "documentType": "Inspection Report", "extractedValue": "Recommended: Provisional 30 Seats (Subject to Faculty Rectification)", "sourcePage": 2, "isMismatched": True, "confidenceScore": 0.97},
        ]),
        human_review_recommendation="Applicant applied for 60 seats; EVC inspection committee recommends restricting provisional sanction to 30 seats until faculty doctoral cadre deficiency is resolved under APH 2024–2027 §6.14 and Annexure 5.2.",
    )

    # Cross doc comparison for Sub-008 (Deccan College Land Lien)
    cd8 = CrossDocComparisonModel(
        id="cdc-008",
        submission_id="sub-008",
        field_name="Land Encumbrance & Mortgage Status",
        description="Institutional land ownership vs commercial bank encumbrance search",
        has_discrepancy=True,
        status_text="Bank Mortgage Lien Flagged",
        entries_json=json.dumps([
            {"documentName": "Applicant Land Self-Declaration", "documentType": "Affidavit", "extractedValue": "Unencumbered, Free from All Charges", "sourcePage": 1, "isMismatched": True, "confidenceScore": 0.99},
            {"documentName": "Sub-Registrar Encumbrance Certificate", "documentType": "Revenue Extract", "extractedValue": "Registered Mortgage Charge in favor of Canara Bank (INR 4.5 Cr)", "sourcePage": 3, "isMismatched": True, "confidenceScore": 0.96},
        ]),
        human_review_recommendation="Under AICTE APH §6.17, institutional land must have clear, marketable title without unrecorded liabilities. Require NOC / No Dues Certificate from the lending bank.",
    )
    db.add_all([cd1, cd2, cd3, cd4, cd8])

    # Seed Initial Coherent Audit Events (Anchored to October 2026)
    audit_events = [
        AuditEventModel(
            id="aud-001",
            submission_id="sub-001",
            application_id="DEMO/2026-27/NPA/KA/001842",
            institution_name="Northstar Institute of Technology",
            action="escalated",
            performed_by="Priya Venkataraman (Senior Compliance Reviewer)",
            timestamp="2026-10-26T18:30:00Z",
            details="Escalated to Hearing Committee due to unresolved faculty cadre doctoral deficiency and disputed GPU hardware declaration.",
        ),
        AuditEventModel(
            id="aud-002",
            submission_id="sub-008",
            application_id="DEMO/2026-27/EOA/TS/004812",
            institution_name="Deccan College of Engineering & Research",
            action="escalated",
            performed_by="Priya Venkataraman (Senior Compliance Reviewer)",
            timestamp="2026-10-26T15:00:00Z",
            details="Escalated for senior legal review: Bank mortgage lien detected on campus parcel Survey No. 48/2.",
        ),
        AuditEventModel(
            id="aud-003",
            submission_id="sub-003",
            application_id="DEMO/2026-27/EXT/TN/007891",
            institution_name="Apex Technical Academy",
            action="decision_approved",
            performed_by="Ramesh Iyer (Reviewer)",
            timestamp="2026-10-25T16:00:00Z",
            details="Simulated decision: MBA intake extension approved — all statutory proformas and faculty rosters cleared.",
        ),
        AuditEventModel(
            id="aud-004",
            submission_id="sub-025",
            application_id="DEMO/2026-27/NPA/MP/002298",
            institution_name="Vindhya Institute of Technology",
            action="decision_rejected",
            performed_by="Ramesh Iyer (Reviewer)",
            timestamp="2026-10-24T11:00:00Z",
            details="Simulated decision: Application rejected — inauthentic municipal occupancy certificate detected.",
        ),
        AuditEventModel(
            id="aud-005",
            submission_id="sub-001",
            application_id="DEMO/2026-27/NPA/KA/001842",
            institution_name="Northstar Institute of Technology",
            action="finding_flagged",
            performed_by="VerifyAI Automated Heuristic Engine",
            timestamp="2026-10-18T11:00:00Z",
            details="Flagged APH §6.14 doctoral cadre mismatch: Proposed Associate Professor doctorate is in Mechanical Engineering.",
        ),
        AuditEventModel(
            id="aud-006",
            submission_id="sub-005",
            application_id="DEMO/2026-27/ACF/RJ/005502",
            institution_name="Vanguard Institute of Engineering",
            action="evidence_requested",
            performed_by="Sunita Sharma (Reviewer)",
            timestamp="2026-10-24T16:00:00Z",
            details="Clarification requested: State university affiliation renewal order and reconstituted Anti-Ragging committee roster.",
        ),
        AuditEventModel(
            id="aud-007",
            submission_id="sub-007",
            application_id="DEMO/2026-27/ACF/WB/006614",
            institution_name="Pinnacle Institute of Technology",
            action="decision_rejected",
            performed_by="Ramesh Iyer (Reviewer)",
            timestamp="2026-10-24T13:00:00Z",
            details="Simulated decision: Rejected — Persistent statutory financial audit non-compliance after three notice cycles.",
        ),
        AuditEventModel(
            id="aud-008",
            submission_id="sub-002",
            application_id="DEMO/2026-27/ACF/MH/003317",
            institution_name="Zenith Institute of Engineering & Technology",
            action="review_started",
            performed_by="Priya Venkataraman (Senior Compliance Reviewer)",
            timestamp="2026-10-25T10:00:00Z",
            details="Dossier scrutiny initiated for annual fee disclosure and enrollment figures.",
        ),
        AuditEventModel(
            id="aud-009",
            submission_id="sub-018",
            application_id="DEMO/2026-27/NPA/RJ/001102",
            institution_name="Thar Desert Technical University",
            action="decision_rejected",
            performed_by="Ramesh Iyer (Reviewer)",
            timestamp="2026-10-24T12:00:00Z",
            details="Simulated decision: Rejected — Revoked municipal fire safety NOC and non-contiguous campus land parcels.",
        ),
        AuditEventModel(
            id="aud-010",
            submission_id="sub-010",
            application_id="DEMO/2026-27/EOA/OD/005118",
            institution_name="Kalinga Academy of Technical Sciences",
            action="decision_approved",
            performed_by="Ramesh Iyer (Reviewer)",
            timestamp="2026-10-24T18:00:00Z",
            details="Simulated decision: Annual Extension of Approval approved — NBA Tier-1 accreditation confirmed.",
        ),
        AuditEventModel(
            id="aud-011",
            submission_id="sub-015",
            application_id="DEMO/2026-27/ACF/HR/007321",
            institution_name="Metro Institute of Management Studies",
            action="finding_flagged",
            performed_by="VerifyAI Automated Heuristic Engine",
            timestamp="2026-10-18T15:20:00Z",
            details="Flagged APH §6.14: Director doctoral degree from foreign institution lacks AIU equivalence certification.",
        ),
        AuditEventModel(
            id="aud-012",
            submission_id="sub-027",
            application_id="DEMO/2026-27/ACF/HR/001929",
            institution_name="Rohtak College of Engineering",
            action="evidence_requested",
            performed_by="Sunita Sharma (Reviewer)",
            timestamp="2026-10-25T15:00:00Z",
            details="Bank ECS salary disbursement statements requested for Q1 and Q2 per 7th CPC guidelines.",
        ),
    ]
    db.add_all(audit_events)

    db.commit()
    print("[VerifyAI DB] Successfully seeded 30 synthetic demo applications with complete evidence and audit history.")

    # Always ensure reviewer accounts exist after submission seeding
    seed_reviewer_accounts(db)

