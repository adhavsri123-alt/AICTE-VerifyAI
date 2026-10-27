// ─── Domain Types ──────────────────────────────────────────────────────────────

export type SubmissionStatus =
  | 'pending_review'
  | 'under_review'
  | 'escalated'
  | 'approved'
  | 'rejected'
  | 'on_hold';

export type FindingSeverity = 'critical' | 'major' | 'minor' | 'info';

export type EvidenceType =
  | 'document'
  | 'affidavit'
  | 'noc'
  | 'approval_letter'
  | 'financial_report'
  | 'inspection_report';

export type AuditAction =
  | 'submission_received'
  | 'review_started'
  | 'finding_flagged'
  | 'escalated'
  | 'decision_approved'
  | 'decision_rejected'
  | 'comment_added'
  | 'evidence_requested';

// ─── Submission ────────────────────────────────────────────────────────────────

export interface Institution {
  id: string;
  name: string;
  city: string;
  state: string;
  type: 'university' | 'college' | 'polytechnic' | 'deemed';
  aicteId: string;
  isSyntheticDemo?: boolean;
}

export interface Finding {
  id: string;
  severity: FindingSeverity;
  category: string;
  description: string;
  flaggedAt: string;
  resolvedAt?: string;
  // Evidence-first review extensions
  ruleOrCheck?: string;
  reason?: string;
  documentId?: string;
  documentName?: string;
  pageNumber?: number;
  highlightSnippetId?: string;
  reviewerNextStep?: string;
  statusNotice?: string;
  findingType?: 'missing_information' | 'inconsistent_information' | 'rule_violation' | 'potential_anomaly';
}

export interface DocumentParagraph {
  id: string;
  text: string;
  findingId?: string;
  isDiscrepancy?: boolean;
  highlightSeverity?: FindingSeverity;
  annotationTitle?: string;
  fieldKey?: string;
}

export interface ReviewDocumentContent {
  documentId: string;
  headerTitle: string;
  subHeader: string;
  referenceNo: string;
  issueDate: string;
  issuingAuthority: string;
  sealText?: string;
  pages: {
    pageNumber: number;
    paragraphs: DocumentParagraph[];
  }[];
}

export interface CrossDocComparisonEntry {
  documentName: string;
  documentType: string;
  extractedValue: string;
  sourcePage: number;
  isMismatched?: boolean;
  confidenceScore: number;
}

export interface CrossDocComparisonField {
  fieldName: string;
  description: string;
  hasDiscrepancy: boolean;
  statusText: string;
  entries: CrossDocComparisonEntry[];
  humanReviewRecommendation: string;
}

export interface ReviewerNoteEntry {
  id: string;
  author: string;
  role: string;
  timestamp: string;
  text: string;
  category: 'general' | 'inspection' | 'legal' | 'faculty' | 'infrastructure';
}

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  name: string;
  uploadedAt: string;
  verificationStatus: 'verified' | 'pending' | 'disputed' | 'missing';
  issuer?: string;
  notes?: string;
  description?: string; // One-sentence summary of what it is and why a reviewer would check it
  // Extended fields for review workspace
  filename?: string;
  fileSizeBytes?: number;
  fileSizeFormatted?: string;
  checksumSha256?: string;
  pageCount?: number;
  findingIds?: string[];
  content?: ReviewDocumentContent;
}

export interface Submission {
  id: string;
  applicationId: string;
  institution: Institution;
  submittedAt: string;
  updatedAt: string;
  status: SubmissionStatus;
  category: string; // e.g. "New Program Approval", "Annual Compliance"
  assignedTo?: string;
  findings: Finding[];
  evidence: EvidenceItem[];
  priorityScore: number; // 0–100
  dueDate: string;
  reviewNotes?: string;
  reviewerNotesList?: ReviewerNoteEntry[];
  crossDocComparisons?: CrossDocComparisonField[];
  isSyntheticDemo?: boolean;
}

// ─── Metrics ───────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalSubmissions: number;
  pendingReview: number;
  underReview: number;
  escalated: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  avgResolutionDays: number;
  criticalFindings: number;
}

// ─── Audit ─────────────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  submissionId: string;
  applicationId: string;
  institutionName: string;
  action: AuditAction;
  performedBy: string;
  timestamp: string;
  details?: string;
}

// ─── Pipeline Stage ────────────────────────────────────────────────────────────

export interface PipelineStage {
  label: string;
  count: number;
  color: string;
}

// ─── Reviewer Profile ──────────────────────────────────────────────────────────

export interface ReviewerProfile {
  id: string;
  name: string;
  role: string;
  avatarInitials: string;
  assignedCount: number;
  resolvedThisMonth: number;
}

// ─── Provenance & Reference Data ──────────────────────────────────────────────

export interface ProvenanceSource {
  id: string;
  title: string;
  issuingAuthority: string;
  sourceUrl: string;
  accessDate: string;
  applicableYear: string;
  description: string;
  transformationNotes: string;
  limitations: string;
}

export interface PublicReferenceRecord {
  id: string;
  institutionName: string;
  state: string;
  city: string;
  aictePermanentId: string;
  aisheCode: string;
  institutionType: string;
  approvalStatus: string;
  academicYear: string; // Source publication / academic approval year
  retrievalDate: string; // Exact date retrieved from official registry
  accessDate: string; // Backward compatibility alias for retrieval date
  approvedProgramCount?: number | string;
  verifiedProgramNote?: string;
  sourceRef: string;
  sourceUrl: string;
}

