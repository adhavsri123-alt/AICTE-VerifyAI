import type { ProvenanceSource, PublicReferenceRecord } from '../types';

/**
 * AICTE VerifyAI — Data Sources & Provenance Registry
 *
 * This module defines:
 * 1. The official public reference sources used for institutional baseline facts & regulatory rules.
 * 2. The factual public reference directory records (NO synthetic findings or fake risks attached).
 * 3. Verified statutory citations from AICTE Approval Process Handbook (APH) 2024–2027:
 *    - §6.14 and Annexure 5.2 (Faculty Cadre 1:2:6, UG Engineering TSR 1:20; Ph.D. mandatory for Professor & Assoc. Prof).
 *    - §6.17 and Annexure 1 (Land Requirements, clear continuous title, Encumbrance Certificate, mortgage restrictions).
 *    - §6.19 and Annexure 4 (Computational Facilities: min 20 PCs/dept lab, 100 PCs central computer centre, licensed software).
 *    - Explicit segregation of Synthetic Demo Rules (e.g. GPU inventory cross-check) from statutory AICTE rules.
 */

export const PROVENANCE_SOURCES: ProvenanceSource[] = [
  {
    id: 'src-aicte-directory',
    title: 'AICTE Approved Institutes Public Web Dashboard',
    issuingAuthority: 'All India Council for Technical Education (AICTE), Ministry of Education, Govt. of India',
    sourceUrl: 'https://facilities.aicte-india.org/dashboard/pages/angulardashboard.php',
    accessDate: '2026-10-23',
    applicableYear: 'Academic Year 2024–2025',
    description:
      'Official public web registry of approved technical institutions, including permanent Institute ID, state, district, institution type, and approved technical programs.',
    transformationNotes:
      'Direct extraction of public entity names, state/city location, and verified AICTE permanent IDs for directory reference. No private or personal contact details retained.',
    limitations:
      'Static reference snapshot as retrieved. For real-time approval status or annual Extension of Approval (EoA) orders, the live AICTE portal remains the sole legal authority.',
  },
  {
    id: 'src-aicte-aph',
    title: 'AICTE Approval Process Handbook (APH) 2024–2027',
    issuingAuthority: 'All India Council for Technical Education (AICTE)',
    sourceUrl: 'https://www.aicte-india.org/sites/default/files/approval/APH%202024-27.pdf',
    accessDate: '2026-10-23',
    applicableYear: '2024–2027',
    description:
      'Statutory regulations governing approvals: §6.14 and Annexure 5.2 (Faculty-Student Ratio 1:20 for UG Engg & Tech, Cadre 1:2:6; Ph.D. compulsory for Professor and Associate Professor only), §6.17 and Annexure 1 (Lawful land possession, clear continuous title, Encumbrance Certificate), and §6.19 / Annexure 4 (Computers: min 20 per dept lab, min 100 in central computing centre, licensed system/application software).',
    transformationNotes:
      'Statutory rule clauses quoted with exact section numbers and annexure tables. Non-statutory checks (such as GPU model specifications) are explicitly segregated as Synthetic Demo Rules.',
    limitations:
      'Applies to AICTE-approved degree and diploma institutions. Any non-standard experimental checks are explicitly designated as "Synthetic Demo Validation Rules".',
  },
  {
    id: 'src-aishe-directory',
    title: 'AISHE (All India Survey on Higher Education) HEI Directory',
    issuingAuthority: 'Department of Higher Education, Ministry of Education, Govt. of India',
    sourceUrl: 'https://aishe.gov.in/aishe/heiDirectory',
    accessDate: '2026-10-23',
    applicableYear: '2022–2024',
    description:
      'National Higher Education Institution directory providing AISHE codes, institution category classifications, and university affiliation mapping.',
    transformationNotes:
      'Used exclusively for institutional category cross-referencing and national identifier alignment.',
    limitations:
      'CRITICAL: AISHE listing reflects survey participation and educational categorization only; it does NOT constitute proof of current or active AICTE technical approval.',
  },
];

/**
 * Factual Public Reference Directory
 * These records contain ONLY verified public information from AICTE mandatory disclosures and AISHE directories.
 * NO synthetic findings, NO risk scores, and NO invented violations are ever attached to these institutions.
 * Actual retrieval dates (2026-10-23) are recorded separately from the academic year / source publication year.
 */
export const PUBLIC_REFERENCE_DIRECTORY: PublicReferenceRecord[] = [
  {
    id: 'ref-01',
    institutionName: 'PSG College of Technology',
    state: 'Tamil Nadu',
    city: 'Coimbatore',
    aictePermanentId: '1-4165514', // Verified from official AICTE Mandatory Disclosure
    aisheCode: 'C-41124',
    institutionType: 'Government Aided Autonomous College',
    approvalStatus: 'Approved (Public Reference)',
    academicYear: '2024–2025',
    retrievalDate: '2026-10-23',
    accessDate: '2026-10-23',
    verifiedProgramNote: 'UG & PG Engineering & Technology (Refer to AICTE EoA for current program counts)',
    sourceRef: 'PSG Tech Official Mandatory Disclosure & AICTE Approvals',
    sourceUrl: 'https://www.psgtech.edu/approval.php',
  },
  {
    id: 'ref-02',
    institutionName: 'College of Engineering, Pune (COEP Technological University)',
    state: 'Maharashtra',
    city: 'Pune',
    aictePermanentId: '1-14626132', // Verified from official AICTE Mandatory Disclosure
    aisheCode: 'U-1175',
    institutionType: 'State Public Technological University',
    approvalStatus: 'Approved (Public Reference)',
    academicYear: '2024–2025',
    retrievalDate: '2026-10-23',
    accessDate: '2026-10-23',
    verifiedProgramNote: 'State Public Technological University (Refer to AICTE EoA)',
    sourceRef: 'COEP Tech Official Portal & Mandatory Disclosure',
    sourceUrl: 'https://www.coeptech.ac.in',
  },
  {
    id: 'ref-03',
    institutionName: 'Delhi Technological University',
    state: 'Delhi',
    city: 'New Delhi',
    aictePermanentId: '1-837103261', // Verified from official AICTE Mandatory Disclosure
    aisheCode: 'U-0098',
    institutionType: 'State Public Technological University',
    approvalStatus: 'Approved (Public Reference)',
    academicYear: '2024–2025',
    retrievalDate: '2026-10-23',
    accessDate: '2026-10-23',
    verifiedProgramNote: 'State Public Technological University (Refer to AICTE EoA)',
    sourceRef: 'DTU Official Portal & AICTE Compliance Section',
    sourceUrl: 'https://www.dtu.ac.in',
  },
  {
    id: 'ref-04',
    institutionName: 'Veermata Jijabai Technological Institute (VJTI)',
    state: 'Maharashtra',
    city: 'Mumbai',
    aictePermanentId: '1-5149491', // Verified from official AICTE Mandatory Disclosure
    aisheCode: 'C-34082',
    institutionType: 'Government Aided Autonomous Institute',
    approvalStatus: 'Approved (Public Reference)',
    academicYear: '2024–2025',
    retrievalDate: '2026-10-23',
    accessDate: '2026-10-23',
    verifiedProgramNote: 'Government Aided Autonomous Institute (Refer to AICTE EoA)',
    sourceRef: 'VJTI Official Portal & AICTE Approvals',
    sourceUrl: 'https://vjti.ac.in',
  },
  {
    id: 'ref-05',
    institutionName: 'Jadavpur University Faculty of Engineering & Technology',
    state: 'West Bengal',
    city: 'Kolkata',
    aictePermanentId: '1-21569051', // Verified from official AICTE Mandatory Disclosure
    aisheCode: 'U-0573',
    institutionType: 'State Public University',
    approvalStatus: 'Approved (Public Reference)',
    academicYear: '2024–2025',
    retrievalDate: '2026-10-23',
    accessDate: '2026-10-23',
    verifiedProgramNote: 'State Public University Technical Faculty (Refer to AICTE EoA)',
    sourceRef: 'Jadavpur University Official Portal & Faculty Council of Engg',
    sourceUrl: 'https://jadavpuruniversity.in',
  },
  {
    id: 'ref-06',
    institutionName: 'BMS College of Engineering',
    state: 'Karnataka',
    city: 'Bengaluru',
    aictePermanentId: '1-5884543', // Verified from official AICTE Mandatory Disclosure
    aisheCode: 'C-20924',
    institutionType: 'Private Autonomous College',
    approvalStatus: 'Approved (Public Reference)',
    academicYear: '2024–2025',
    retrievalDate: '2026-10-23',
    accessDate: '2026-10-23',
    verifiedProgramNote: 'Private Autonomous College (Refer to AICTE EoA)',
    sourceRef: 'BMSCE Official Mandatory Disclosure Portal',
    sourceUrl: 'https://bmsce.ac.in/home/Mandatory-Disclosure',
  },
];

/**
 * Synthetic Demo Applications
 * The primary featured test case is strictly the fictional "Northstar Institute of Technology".
 * All documents, findings, discrepancies, and reviewer actions are 100% synthetic demo artifacts.
 */
export const SYNTHETIC_DEMO_NOTICE = {
  featuredInstitution: 'Northstar Institute of Technology',
  disclaimer:
    'Fictional institution and synthetic compliance case created solely for Smart India Hackathon (SIH) prototype demonstration. Does not represent any real-world technical institute or actual regulatory violation.',
  documentWatermark: 'SAMPLE / DEMO — NOT AN OFFICIAL CERTIFICATE',
};
