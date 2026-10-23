# AICTE VerifyAI — Data Provenance & Source Grounding Documentation

This document describes the data strategy, official public reference sources, verified statutory rule citations with exact excerpts, and synthetic demo datasets used in the **AICTE VerifyAI** frontend prototype for the Smart India Hackathon (SIH).

---

## 1. Data Strategy Architecture

The application strictly separates data into two isolated, clearly identified tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AICTE VerifyAI Data Tier                        │
├──────────────────────────────────┬─────────────────────────────────────┤
│   1. Public Reference Data       │   2. Synthetic Demo Data            │
│  • Official AICTE Directory      │  • Featured Fictional Case:         │
│  • APH 2024–2027 Regulations     │    "Northstar Institute of Tech"    │
│  • AISHE HEI Classifications     │  • Synthetic Document Artifacts     │
│  • Verified Public Facts Only    │  • Synthetic Demo Validation Rules  │
│  • NO synthetic findings/risks   │  • Visible SAMPLE / DEMO Badges     │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 2. Public Reference Data Sources & Rule Grounding

### Source 1: AICTE Approved Institutes Public Web Dashboard
- **Issuing Authority**: All India Council for Technical Education (AICTE), Ministry of Education, Govt. of India
- **Source URL**: [https://facilities.aicte-india.org/dashboard/pages/angulardashboard.php](https://facilities.aicte-india.org/dashboard/pages/angulardashboard.php)
- **Applicable Academic Year**: Academic Year 2024–2025
- **Retrieval Date**: October 23, 2026 (Verified)
- **Extracted Fields**: Institution Legal Name, Permanent AICTE Institute ID, State, District/City, Sponsoring Body.
- **Privacy & Minimization Policy**: **Zero personal data collected**. No faculty names, student records, phone numbers, or staff details are imported.
- **Limitations**: Static directory reference snapshot. Official real-time approval status and annual Extension of Approval (EoA) orders are exclusively determined via AICTE's live portal.

### Source 2: AICTE Approval Process Handbook (APH) 2024–2027
- **Title**: Approval Process Handbook (APH) 2024–2025 to 2026–2027
- **Issuing Authority**: All India Council for Technical Education (AICTE)
- **Official Source URL**: [https://www.aicte-india.org/sites/default/files/approval/APH%202024-27.pdf](https://www.aicte-india.org/sites/default/files/approval/APH%202024-27.pdf)
- **Applicable Cycle**: 2024–2027
- **Retrieval Date**: October 23, 2026 (Verified)
- **Verified Statutory Provisions & Excerpts**:

  1. **Faculty Requirements, Cadre Ratio & Qualifications (§6.14 and Annexure 5.2)**:
     - *Citation*: Chapter VI, §6.14 and Annexure 5.2 (*Faculty Cadre and Qualifications for Degree Engineering and Technology*).
     - *Handbook Excerpt*:
       > "Cadre Ratio shall be 1 : 2 : 6 (Professor : Associate Professor : Assistant Professor). Faculty:Student Ratio for UG Degree Engineering: 1:20." — APH Annexure 5.2
     - *Qualifications Nuance*:
       - **Professor**: Ph.D. degree in the relevant discipline and minimum 10 years experience in teaching/research/industry.
       - **Associate Professor**: Ph.D. degree in the relevant discipline and minimum 5 years experience.
       - **Assistant Professor**: Bachelor's and Master's degree in the relevant branch with First Class. **Ph.D. is NOT a blanket requirement for entry-level Assistant Professors**.
     - *Demo Application*: In the Northstar case, candidate Dr. P. Sangeetha’s doctorate is in Mechanical Engineering ("Dynamic Thermal Dissipation"), which fails the domain-relevance requirement specifically for the proposed AI & Data Science Associate Professor cadre slot.

  2. **Land Requirements, Title Ownership & Encumbrance Status (§6.17 and Annexure 1)**:
     - *Citation*: Chapter VI, §6.17 and Annexure 1 (*Norms for Land and Built-up Area Requirements*).
     - *Handbook Excerpt*:
       > "The Promoter Society/Trust/Company/University shall have lawful possession of the land with clear, marketable title registered in its name on or before the date of submission of application... The land shall be continuous without any division and free from any unrecorded liabilities... Encumbrance Certificate issued by the competent Registration Authority is mandatory." — APH §6.17 & Annexure 1
       > "Mortgaging of institutional land is permitted ONLY after the issuance of Letter of Approval (LoA) and strictly for raising funds for the development of the technical institution situated on that specific land, with prior intimation to AICTE." — APH §6.17
     - *Demo Application*: Flags the historical entity title divergence between the 1998 registered deed ("Northstar Technical Institute") and the 2024 application ("Northstar Institute of Technology") under the same sponsoring trust.

  3. **Computational Facilities, Software & Laboratory Equipment (§6.19 and Annexure 4)**:
     - *Citation*: Chapter VI, §6.19 and Annexure 4 (*Norms for Books, Library facilities, Computer, Software, Internet, Printers and Laboratory Equipment of the Technical Institutions*).
     - *Handbook Excerpt*:
       > "Every Department shall have a separate Computer Laboratory with at least 20 computers (PCs/workstations)... The Institution shall have a Centralized Computer Centre with at least 100 computers... System and Application Software packages must be legal and licensed. PCs for Faculty, Library, and Administrative Office shall be over and above the student computer quotas." — APH Annexure 4
     - *(Note: Arbitrary/unsupported 1:6 ratio figure removed; statutory quota specifies 20 PCs per departmental lab and 100 PCs in the centralized computer centre).*

  4. **Specialized GPU / HPC Laboratory Verification (Segregated Citation)**:
     - *Classification*: **Synthetic Demo Rule (Institutional Self-Declaration Reconciliation)**.
     - *Handbook Boundary*: The AICTE Approval Process Handbook 2024–2027 does **NOT** mandate specific GPU models (e.g. NVIDIA RTX A6000) or high-performance compute clusters.
     - *Demo Grounding*: Finding #fnd-001b is an automated consistency check comparing self-declared specialized hardware on proforma (30 workstations) against physical on-site serial inspection (16 verified operational; 14 unaccounted for without delivery challans). It is explicitly designated as a **Synthetic Demo Validation Rule**, not an AICTE statutory mandate.

### Source 3: AISHE Higher Education Institution (HEI) Directory
- **Issuing Authority**: Department of Higher Education, Ministry of Education, Govt. of India
- **Source URL**: [https://aishe.gov.in/aishe/heiDirectory](https://aishe.gov.in/aishe/heiDirectory)
- **Applicable Year**: 2022–2024
- **Retrieval Date**: October 23, 2026 (Verified)
- **Extracted Fields**: National AISHE Code, Institution Management Category (Government, Aided, Private Autonomous), Affiliated University.
- **Critical Limitation Disclaimer**: **AISHE listing reflects educational census participation only; it does NOT constitute proof of active AICTE technical approval**.

---

## 3. Verified Factual Institutions in Reference Directory

The Public Reference Directory contains only verified factual metadata from official institutional mandatory disclosures and AICTE/AISHE records. **Zero synthetic findings, risk scores, or negative discrepancies are ever attached to these institutions.**

| Institution Name | Location | AICTE Permanent ID | AISHE Code | Management Category | Direct Official Source URL | Retrieval Date |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PSG College of Technology** | Coimbatore, Tamil Nadu | `1-4165514` | `C-41124` | Government Aided Autonomous College | [https://www.psgtech.edu/approval.php](https://www.psgtech.edu/approval.php) | 2026-10-23 |
| **COEP Technological University** | Pune, Maharashtra | `1-14626132` | `U-1175` | State Public Technological University | [https://www.coeptech.ac.in](https://www.coeptech.ac.in) | 2026-10-23 |
| **Delhi Technological University (DTU)** | New Delhi, Delhi | `1-837103261` | `U-0098` | State Public Technological University | [https://www.dtu.ac.in](https://www.dtu.ac.in) | 2026-10-23 |
| **Veermata Jijabai Technological Institute (VJTI)** | Mumbai, Maharashtra | `1-5149491` | `C-34082` | Government Aided Autonomous Institute | [https://vjti.ac.in](https://vjti.ac.in) | 2026-10-23 |
| **Jadavpur University (Faculty of Engineering)** | Kolkata, West Bengal | `1-21569051` | `U-0573` | State Public University Faculty | [https://jadavpuruniversity.in](https://jadavpuruniversity.in) | 2026-10-23 |
| **BMS College of Engineering** | Bengaluru, Karnataka | `1-5884543` | `C-20924` | Private Autonomous College | [https://bmsce.ac.in/home/Mandatory-Disclosure](https://bmsce.ac.in/home/Mandatory-Disclosure) | 2026-10-23 |

*Note: Dynamic approved program counts and annual extensions of approval (EoA) vary by cycle and must be referenced directly from live AICTE portal queries rather than static extracts.*

---

## 4. Synthetic Demo Applications & The Fictional Case

### Featured Primary Case: Northstar Institute of Technology
- **Institution**: **Northstar Institute of Technology** (Fictional Institution)
- **Location**: Bengaluru, Karnataka (Simulated address: Tech Knowledge Park, Whitefield Extension)
- **Application ID**: `DEMO/2024-25/NPA/KA/001842`
- **Application Category**: `New Program Approval — B.Tech Artificial Intelligence & Data Science (Intake: 60)`
- **Priority Score**: `91 / 100` (Heuristic Priority Score)
- **Review Status**: `Escalated` (Simulated case requiring human scrutiny)

### Ethical Rule on Real Institutions
> **Mandatory Ethical Constraint**:
> **Never attach invented findings, risk scores, discrepancies, or regulatory sanctions to a real institution.**
> All active review cases, documents, discrepancies, and findings are strictly attached to fictional demo institutions (**Northstar Institute of Technology**, **Apex Technical Academy**, **Zenith Institute of Engineering**, **Horizon Institute**, **Vanguard Institute**).

### Synthetic Document Mockups & Disclaimers
1. **Document Watermark**: Every document mockup visibly displays:
   `SAMPLE / DEMO — NOT AN OFFICIAL CERTIFICATE`
2. **No Real Government Seals**: Document mockups use synthetic neutral styling and explicitly state:
   *"Fictional document generated for SIH VerifyAI evaluation only. Not an official regulatory instrument."*
3. **Cryptographic File-Integrity Checksums**:
   SHA-256 hashes are presented strictly as **file-integrity identifiers** (verifying that the binary file has not changed since upload). The system explicitly disclaims that hashes prove real-world authenticity or issuing authority.
4. **Advisory Heuristics**:
   All findings are labeled as advisory flags for human reviewer consideration, explicitly avoiding accusations of fraud.

---

## 5. API Contract Status for Backend Teammate

All frontend data requests are abstracted through the service layer in [`src/services/api.ts`](file:///c:/Users/Adhav/Downloads/SIHNEW/src/services/api.ts). The API routes (`/api/v1/submissions`, `/api/v1/submissions/{id}`, `/api/v1/submissions/{id}/approve`, etc.) are designated as **proposed contracts** pending final confirmation by the backend teammate.
