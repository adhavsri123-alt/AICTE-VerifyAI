import type {
  ReviewDocumentContent,
  CrossDocComparisonField,
  ReviewerNoteEntry,
} from '../types';

export const mockNorthstarContent: Record<string, ReviewDocumentContent> = {
  'ev-001c': {
    documentId: 'ev-001c',
    headerTitle: '[SAMPLE / DEMO] HIGHER EDUCATION SCRUTINY CELL — STATE AFFILIATION BOARD',
    subHeader: 'Faculty Qualification Dossier & Cadre Scrutiny (B.Tech AI & Data Science) — DEMO PROFORMA',
    referenceNo: 'DEMO/VTU/FAC-QUAL/2024-25/AI-881',
    issueDate: '18 October 2024',
    issuingAuthority: 'Academic Scrutiny Committee (Simulated Evaluation Record)',
    sealText: 'SAMPLE / DEMO PROFORMA · Technical Education Verification Cell',
    pages: [
      {
        pageNumber: 1,
        paragraphs: [
          {
            id: 'p-fac-p1-1',
            text: '1. PREAMBLE: The applicant institution, Northstar Institute of Technology, has submitted an application for introductory sanction of intake for 60 seats in B.Tech Artificial Intelligence & Data Science under the Faculty of Engineering & Technology.',
          },
          {
            id: 'p-fac-p1-2',
            text: '2. STATUTORY CADRE REQUIREMENT: Under AICTE Approval Process Handbook (APH) 2024–2027 §6.14 and Annexure 5 (specifically Annexure 5.2: Faculty Cadre and Qualifications for Degree Engineering and Technology), for an approved intake of 60 students in Under Graduate Degree Engineering, the prescribed teacher-student ratio is 1:20 with a cadre ratio of Professor : Associate Professor : Assistant Professor = 1 : 2 : 6. Mandatory awarded doctoral degrees (Ph.D.) apply to Professor and Associate Professor posts (Assistant Professor posts require Master\'s degree with First Class).',
          },
        ],
      },
      {
        pageNumber: 2,
        paragraphs: [
          {
            id: 'p-fac-p2-1',
            text: '3. SUBMITTED FACULTY SUMMARY: The institution submitted biodata, identity tokens, and qualification certificates for eight (8) proposed full-time teaching faculty for the introductory academic cycles.',
          },
          {
            id: 'p-fac-p2-2',
            text: '4. VERIFICATION OF QUALIFICATIONS: Primary verification against educational repository records was simulated on 12-10-2024.',
          },
        ],
      },
      {
        pageNumber: 3,
        paragraphs: [
          {
            id: 'snip-faculty-01',
            text: '5. DOCTORAL QUALIFICATION DISCREPANCY: Scrutiny reveals that among proposed senior cadre posts, only 3 of the designated faculty hold awarded Ph.D. degrees. Dr. P. Sangeetha\'s thesis titled "Dynamic Thermal Dissipation in High-Pressure Mechanical Turbines" (awarded 2018) reflects specialization in Mechanical Engineering rather than Computing/Data Sciences. Under AICTE APH 2024–2027 §6.14 and Annexure 5.2, specialized programmes require domain-relevant doctoral qualifications for core Professor and Associate Professor cadre positions.',
            findingId: 'fnd-001a',
            isDiscrepancy: true,
            highlightSeverity: 'critical',
            annotationTitle: 'Critical Cadre & Ph.D. Norm Shortfall',
            fieldKey: 'Faculty Doctoral Ratio',
          },
          {
            id: 'p-fac-p3-2',
            text: '6. INSTITUTIONAL UNDERTAKING: The Principal has appended an undertaking stating that two Assistant Professors (Sri S. Bharath and Smt. Divya Nair) have submitted their Ph.D. theses and await viva-voce examination in December 2024.',
          },
          {
            id: 'p-fac-p3-3',
            text: '7. RECOMMENDATION: The Scrutiny Committee places this matter under CONDITIONAL ESCALATION pending submission of domain-specific doctoral award certificates or induction of qualified faculty.',
          },
        ],
      },
    ],
  },

  'ev-001b': {
    documentId: 'ev-001b',
    headerTitle: '[SAMPLE / DEMO] EXPERT VISIT COMMITTEE (EVC) — REGIONAL INSPECTION RECORD',
    subHeader: 'Physical On-Site Inspection & Computational Infrastructure Audit — DEMO PROFORMA',
    referenceNo: 'DEMO/AICTE/EVC-REP/2024/KA-0423/88',
    issueDate: '28 October 2024',
    issuingAuthority: 'Expert Visit Committee Panel (Simulated Evaluation Record)',
    sealText: 'SAMPLE / DEMO PROFORMA · Physical Infrastructure Audit Form 4-EVC',
    pages: [
      {
        pageNumber: 1,
        paragraphs: [
          {
            id: 'p-evc-p1-1',
            text: '1. INSPECTION MANDATE: The Expert Visit Committee conducted physical verification of Northstar Institute of Technology campus, Knowledge Park, Whitefield Extension, Bengaluru on Monday, 28th October 2024 for physical infrastructure verification.',
          },
          {
            id: 'p-evc-p1-2',
            text: '2. INFRASTRUCTURE ASSESSMENT: The committee inspected instructional spaces, computing laboratories, digital library servers, barrier-free access elevators, and solar power backup installations.',
          },
        ],
      },
      {
        pageNumber: 2,
        paragraphs: [
          {
            id: 'snip-infra-01',
            text: '3. COMPUTING LABORATORY DISCREPANCY (SYNTHETIC DEMO VALIDATION RULE): In Room CS-302, the self-disclosure declared thirty (30) specialized workstations equipped with high-performance GPUs. Physical on-site serial audit verified only sixteen (16) operational units. Fourteen (14) workstations were neither installed nor present in stores; lab superintendent cited vendor delay without furnishing verified delivery challans. [Rule Grounding: Evaluated under Synthetic Demo Validation Rule for institutional self-declaration reconciliation; AICTE statutory norms under APH 2024–2027 §6.19 and Annexure 4 prescribe departmental lab minimums of 20 PCs, centralized computer centre minimums of 100 PCs, and legal system/application software, rather than specific GPU hardware mandates].',
            findingId: 'fnd-001b',
            isDiscrepancy: true,
            highlightSeverity: 'major',
            annotationTitle: 'Synthetic Demo Rule: GPU Lab Inventory Discrepancy (14 units unaccounted for)',
            fieldKey: 'HPC Laboratory Inventory',
          },
          {
            id: 'p-evc-p2-2',
            text: '4. ELECTRICAL & COOLING CAPACITY: Dedicated 40 kVA online UPS system and redundant precision air conditioning units in CS-302 were examined and found to comply with electrical safety norms.',
          },
        ],
      },
    ],
  },

  'ev-001e': {
    documentId: 'ev-001e',
    headerTitle: '[SAMPLE / DEMO] EXTRACT OF REGISTERED TITLE CONVEYANCE DEED — DEMO RECORD',
    subHeader: 'Land Parcel Schedule & Encumbrance Verification Extract — DEMO PROFORMA',
    referenceNo: 'DEMO/REG/VOL-1998/BK-1/DOC-3481/CERT',
    issueDate: '14 August 1998 (Certified Re-issue: 12 Oct 2024)',
    issuingAuthority: 'Registration & Title Scrutiny Desk (Simulated Record)',
    sealText: 'SAMPLE / DEMO PROFORMA · Simulated Land Registry Copy',
    pages: [
      {
        pageNumber: 1,
        paragraphs: [
          {
            id: 'snip-land-01',
            text: 'SCHEDULE PROPERTY & CONVEYANCE: All that piece and parcel of land admeasuring 23 Acres 14 Guntas in Survey Numbers 34/1, 34/2, and 35/B, Bengaluru East, executed in favour of "Northstar Technical Institute" represented by the Secretary, Northstar Educational & Charitable Trust. Under AICTE Approval Process Handbook (APH) 2024–2027 §6.17 and Annexure 1 (Land Requirements, Lawful Title & Encumbrance Status), the land parcel must be continuous, in lawful possession of the applicant entity, with a clear marketable title supported by a valid Encumbrance Certificate (EC). Search in book-1 records confirms property is unencumbered, but entity title divergence requires formal resolution.',
            findingId: 'fnd-001c',
            isDiscrepancy: true,
            highlightSeverity: 'minor',
            annotationTitle: 'Entity Title Discrepancy (1998 Institute vs 2024 College/Institute)',
            fieldKey: 'Registered Entity Legal Name',
          },
          {
            id: 'p-lnd-p1-2',
            text: 'ZONING VERIFICATION: Certified for Educational Institutional Use under Master Plan zoning guidelines. Permanent possession and contiguous campus boundaries verified.',
          },
        ],
      },
    ],
  },

  'ev-001a': {
    documentId: 'ev-001a',
    headerTitle: '[SAMPLE / DEMO] STATE TECHNICAL EDUCATION DEPARTMENT — NO OBJECTION CERTIFICATE',
    subHeader: 'State Government No Objection Certificate (NOC) for Academic Expansion — DEMO RECORD',
    referenceNo: 'DEMO/DOTE/NOC/2024/0891-ENG',
    issueDate: '04 September 2024',
    issuingAuthority: 'State Technical Directorate (Simulated Evaluation Record)',
    sealText: 'SAMPLE / DEMO PROFORMA · Simulated State Government NOC',
    pages: [
      {
        pageNumber: 1,
        paragraphs: [
          {
            id: 'p-noc-p1-1',
            text: 'STATE GOVERNMENT CLEARANCE: No Objection is conveyed for "Northstar Institute of Technology, Knowledge Park, Whitefield Extension, Bengaluru" for seeking AICTE approval to commence B.Tech in Artificial Intelligence & Data Science with an intake of 60 (Sixty) seats for the academic session 2025–26.',
          },
          {
            id: 'p-noc-p1-2',
            text: 'CONDITIONS PRECEDENT: This NOC does not exempt the applicant from full compliance with AICTE faculty qualifications, laboratory infrastructure norms, and university affiliation regulations.',
          },
        ],
      },
    ],
  },

  'ev-001d': {
    documentId: 'ev-001d',
    headerTitle: '[SAMPLE / DEMO] INDEPENDENT AUDITOR REPORT ON CORPUS & ASSETS',
    subHeader: 'Statutory Audit Report on Balance Sheet & Academic Reserves (FY 2023–24) — DEMO RECORD',
    referenceNo: 'DEMO/UDIN: 24042388BGHS7712',
    issueDate: '15 July 2024',
    issuingAuthority: 'Statutory Auditor Desk (Simulated Financial Review)',
    sealText: 'SAMPLE / DEMO PROFORMA · Simulated Audit Seal',
    pages: [
      {
        pageNumber: 1,
        paragraphs: [
          {
            id: 'p-fin-p1-1',
            text: 'FINANCIAL VIABILITY OPINION: We have audited the Balance Sheet of Northstar Institute of Technology (managed by Northstar Educational & Charitable Trust) as of 31 March 2024. The institution maintains dedicated fixed deposit reserves of INR 12.80 Crores toward academic infrastructure and faculty gratuity funds, fulfilling AICTE financial viability norms.',
          },
        ],
      },
    ],
  },
};

export const mockNorthstarCrossDocComparisons: CrossDocComparisonField[] = [
  {
    fieldName: 'Institution Legal Entity Name',
    description: 'Entity legal title comparison across submitted statutory deeds, state approvals, and regulatory filing.',
    hasDiscrepancy: true,
    statusText: 'Discrepancy Flagged for Human Review',
    humanReviewRecommendation:
      'Reconcile entity title between 1998 Land Deed ("Northstar Technical Institute") and 2024 AICTE Application ("Northstar Institute of Technology"). Verify that a formal Government gazette renaming order or trust deed amendment is on record.',
    entries: [
      {
        documentName: 'AICTE Online Application Form (2024–25 Demo)',
        documentType: 'Regulatory Application',
        extractedValue: 'Northstar Institute of Technology',
        sourcePage: 1,
        isMismatched: false,
        confidenceScore: 99.8,
      },
      {
        documentName: 'State Government NOC (Demo)',
        documentType: 'State Government NOC',
        extractedValue: 'Northstar Institute of Technology, Knowledge Park, Whitefield Extension',
        sourcePage: 1,
        isMismatched: false,
        confidenceScore: 98.6,
      },
      {
        documentName: 'Trust Deed & Registration (Demo)',
        documentType: 'Trust Deed',
        extractedValue: 'Northstar Educational & Charitable Trust — Sponsoring Body',
        sourcePage: 2,
        isMismatched: false,
        confidenceScore: 96.4,
      },
      {
        documentName: 'Registered Land Conveyance Deed (1998 Demo)',
        documentType: 'Land Revenue Title',
        extractedValue: 'Northstar Technical Institute',
        sourcePage: 1,
        isMismatched: true,
        confidenceScore: 94.1,
      },
    ],
  },
  {
    fieldName: 'Campus Land Area & Survey Coordinates',
    description: 'Physical campus land extent and survey numbers across revenue deed, municipal NOC, and application.',
    hasDiscrepancy: false,
    statusText: 'Concordant Across 3 Documents',
    humanReviewRecommendation:
      'All 3 statutory instruments corroborate contiguous 23.0 Acres in Survey Nos. 34/1, 34/2, and 35/B.',
    entries: [
      {
        documentName: 'AICTE Online Application Form (2024–25 Demo)',
        documentType: 'Regulatory Application',
        extractedValue: '23.0 Acres (Survey Nos. 34/1, 34/2, 35/B)',
        sourcePage: 4,
        isMismatched: false,
        confidenceScore: 99.1,
      },
      {
        documentName: 'Land Conveyance Deed & Encumbrance Record',
        documentType: 'Land Revenue Title',
        extractedValue: '23 Acres 14 Guntas (Survey Nos. 34/1, 34/2, 35/B, Bengaluru East)',
        sourcePage: 1,
        isMismatched: false,
        confidenceScore: 97.9,
      },
      {
        documentName: 'Fire Safety Clearance NOC (Demo)',
        documentType: 'Municipal Clearance',
        extractedValue: '23.0 Acres Educational Complex, Knowledge Park',
        sourcePage: 1,
        isMismatched: false,
        confidenceScore: 98.2,
      },
    ],
  },
  {
    fieldName: 'Proposed AI & DS Student Intake',
    description: 'Sanctioned student intake declared by applicant versus expert inspection recommendation.',
    hasDiscrepancy: true,
    statusText: 'Intake Divergence Flagged',
    humanReviewRecommendation:
      'Applicant applied for 60 seats; EVC inspection committee recommends restricting provisional sanction to 30 seats until faculty doctoral cadre deficiency is resolved under APH 2024–2027 §6.14 and Annexure 5.2.',
    entries: [
      {
        documentName: 'AICTE Online Application Form (2024–25 Demo)',
        documentType: 'Regulatory Application',
        extractedValue: '60 Seats (Single Division / Shift 1)',
        sourcePage: 2,
        isMismatched: false,
        confidenceScore: 100.0,
      },
      {
        documentName: 'State Government NOC (Demo)',
        documentType: 'State Government NOC',
        extractedValue: 'No Objection for 60 Seats (Subject to AICTE)',
        sourcePage: 1,
        isMismatched: false,
        confidenceScore: 99.2,
      },
      {
        documentName: 'Expert Visit Committee Report (Demo)',
        documentType: 'Inspection Report',
        extractedValue: 'Recommended: Provisional 30 Seats (Subject to Faculty Rectification)',
        sourcePage: 2,
        isMismatched: true,
        confidenceScore: 97.5,
      },
    ],
  },
];

export const mockNorthstarReviewerNotes: ReviewerNoteEntry[] = [
  {
    id: 'note-01',
    author: 'Priya Venkataraman',
    role: 'Senior Compliance Reviewer',
    timestamp: '2024-11-10T14:15:00Z',
    text: 'Cross-checked doctoral degrees against verification database. Dr. P. Sangeetha doctorate is in Mechanical Engineering. Dispatched clarification query to institution registrar regarding doctoral cadre compliance under AICTE APH 2024–2027 §6.14 and Annexure 5.2.',
    category: 'faculty',
  },
  {
    id: 'note-02',
    author: 'Dr. Anand Joshi',
    role: 'Regional Scrutiny Officer',
    timestamp: '2024-11-12T11:45:00Z',
    text: 'On-site EVC noted missing 14 workstations in CS-302. Institution principal stated OEM delivery was delayed. Requested purchase orders and delivery challans.',
    category: 'infrastructure',
  },
  {
    id: 'note-03',
    author: 'Priya Venkataraman',
    role: 'Senior Compliance Reviewer',
    timestamp: '2024-11-18T10:30:00Z',
    text: 'Case escalated to Hearing Board due to combined faculty doctoral deficit and lab inventory divergence. Scheduled for virtual hearing review.',
    category: 'inspection',
  },
];

export function generateGenericDocumentContent(
  docId: string,
  docName: string,
  institutionName: string,
  appId: string
): ReviewDocumentContent {
  return {
    documentId: docId,
    headerTitle: '[SAMPLE / DEMO] TECHNICAL EDUCATION COMPLIANCE PROFORMA',
    subHeader: `Compliance Assessment & Verification Extract · ${docName}`,
    referenceNo: `DEMO/AICTE/DOC/${appId.replace(/[^a-zA-Z0-9]/g, '-')}/${docId}`,
    issueDate: '01 November 2024',
    issuingAuthority: 'Competent Scrutiny Desk (Simulated Record)',
    sealText: 'SAMPLE / DEMO PROFORMA · Simulated Electronic Copy',
    pages: [
      {
        pageNumber: 1,
        paragraphs: [
          {
            id: `p-${docId}-1`,
            text: `[SAMPLE / DEMO] This document constitutes a synthetic uploaded record for ${institutionName} under Application Reference ${appId}.`,
          },
          {
            id: `p-${docId}-2`,
            text: `Document Title: "${docName}". The contents have been indexed and ingested into the compliance analysis engine for automated heuristic consistency checks.`,
          },
          {
            id: `p-${docId}-3`,
            text: 'All mandatory seals, signatures, and date stamps have been simulated for evaluation. No real-world validity or certificate authenticity is claimed.',
          },
        ],
      },
    ],
  };
}
