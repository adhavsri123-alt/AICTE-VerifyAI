from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class InstitutionSchema(BaseModel):
    id: str
    name: str
    city: str
    state: str
    type: str
    aicteId: str
    isSyntheticDemo: Optional[bool] = True

    class Config:
        from_attributes = True


class FindingSchema(BaseModel):
    id: str
    severity: str
    category: str
    description: str
    flaggedAt: str
    resolvedAt: Optional[str] = None
    ruleOrCheck: Optional[str] = None
    reason: Optional[str] = None
    documentId: Optional[str] = None
    documentName: Optional[str] = None
    pageNumber: Optional[int] = None
    highlightSnippetId: Optional[str] = None
    reviewerNextStep: Optional[str] = None
    statusNotice: Optional[str] = None
    findingType: Optional[str] = "rule_violation"

    class Config:
        from_attributes = True


class EvidenceItemSchema(BaseModel):
    id: str
    type: str
    name: str
    uploadedAt: str
    verificationStatus: str
    issuer: Optional[str] = None
    notes: Optional[str] = None
    description: Optional[str] = None
    filename: Optional[str] = None
    fileSizeBytes: Optional[int] = None
    fileSizeFormatted: Optional[str] = None
    checksumSha256: Optional[str] = None
    pageCount: Optional[int] = 1
    findingIds: Optional[List[str]] = []
    content: Optional[Any] = None

    class Config:
        from_attributes = True


class ReviewerNoteSchema(BaseModel):
    id: str
    author: str
    role: str
    timestamp: str
    text: str
    category: str

    class Config:
        from_attributes = True


class CrossDocComparisonEntrySchema(BaseModel):
    documentName: str
    documentType: str
    extractedValue: str
    sourcePage: int
    isMismatched: Optional[bool] = False
    confidenceScore: float


class CrossDocComparisonSchema(BaseModel):
    fieldName: str
    description: str
    hasDiscrepancy: bool
    statusText: str
    entries: List[CrossDocComparisonEntrySchema]
    humanReviewRecommendation: str

    class Config:
        from_attributes = True


class SubmissionSchema(BaseModel):
    id: str
    applicationId: str
    institution: InstitutionSchema
    submittedAt: str
    updatedAt: str
    status: str
    category: str
    assignedTo: Optional[str] = None
    priorityScore: int
    dueDate: str
    reviewNotes: Optional[str] = None
    findings: List[FindingSchema] = []
    evidence: List[EvidenceItemSchema] = []
    reviewerNotesList: List[ReviewerNoteSchema] = []
    crossDocComparisons: List[CrossDocComparisonSchema] = []
    isSyntheticDemo: Optional[bool] = True

    class Config:
        from_attributes = True


class SubmissionListResponse(BaseModel):
    items: List[SubmissionSchema]
    total: int
    page: int
    limit: int


class DashboardMetricsSchema(BaseModel):
    totalSubmissions: int
    pendingReview: int
    underReview: int
    escalated: int
    approvedThisMonth: int
    rejectedThisMonth: int
    avgResolutionDays: float
    criticalFindings: int


class AuditEventSchema(BaseModel):
    id: str
    submissionId: str
    applicationId: str
    institutionName: str
    action: str
    performedBy: str
    timestamp: str
    details: Optional[str] = None

    class Config:
        from_attributes = True


class ActionRequestPayload(BaseModel):
    notes: Optional[str] = None
    reason: Optional[str] = None
    performedBy: Optional[str] = "Priya Venkataraman (Reviewer)"


class AddNotePayload(BaseModel):
    author: str
    role: str
    text: str
    category: str = "general"


class DocumentUploadResponse(BaseModel):
    success: bool
    message: str
    documentId: str
    filename: str
    fileSizeBytes: int
    checksumSha256: str
    pageCount: int
    ocrUsed: bool
    ocrStatus: str
    extractedFields: Dict[str, Any]
    findingsRaised: List[FindingSchema]
    newStatus: str
