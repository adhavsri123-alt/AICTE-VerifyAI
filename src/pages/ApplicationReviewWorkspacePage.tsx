import React, { useState, useEffect } from 'react';
import type {
  Submission,
  Finding,
  EvidenceItem,
  AuditEvent,
} from '../types';
import {
  fetchSubmissionById,
  approveSubmission,
  rejectSubmission,
  escalateSubmission,
  requestEvidence,
  fetchAuditEvents,
} from '../services/api';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { HelpTooltip } from '../components/ui/HelpTooltip';
import { InspectFindingModal } from '../components/common/InspectFindingModal';
import { formatDate } from '../utils/helpers';
import {
  downloadSampleDocument,
  downloadAllDossierDocuments,
  downloadReviewSummaryReport,
} from '../utils/downloadHelpers';
import { DocumentViewer } from '../components/review/DocumentViewer';
import { FindingsPanel } from '../components/review/FindingsPanel';
import { CrossDocComparisonView } from '../components/review/CrossDocComparisonView';
import { ReviewerNotesAndTimeline } from '../components/review/ReviewerNotesAndTimeline';
import { generateGenericDocumentContent } from '../data/reviewMockDetails';
import { UploadDocumentModal } from '../components/review/UploadDocumentModal';
import { ConsequentialActionModal } from '../components/review/ConsequentialActionModal';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Send,
  XCircle,
  FileText,
  GitCompare,
  MessageSquare,
  Download,
  FolderDown,
  Upload,
} from 'lucide-react';

interface ApplicationReviewWorkspacePageProps {
  submissionId: string;
  onBack: () => void;
  onStatusUpdated?: () => void;
}

export const ApplicationReviewWorkspacePage: React.FC<ApplicationReviewWorkspacePageProps> = ({
  submissionId,
  onBack,
  onStatusUpdated,
}) => {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'evidence' | 'cross-doc' | 'notes'>('evidence');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingActionType, setPendingActionType] = useState<'approve' | 'reject' | 'escalate' | 'request-evidence' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [inspectingFinding, setInspectingFinding] = useState<Finding | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchSubmissionById(submissionId);
      setSubmission(data);

      // Default active document
      if (data.evidence.length > 0) {
        setSelectedDocId(data.evidence[0].id);
        setCurrentPage(1);
      }

      // Default active finding
      if (data.findings.length > 0) {
        setSelectedFindingId(data.findings[0].id);
      }

      const events = await fetchAuditEvents(50);
      setAuditEvents(events.filter((e) => e.submissionId === submissionId || e.applicationId === data.applicationId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [submissionId]);

  if (loading || !submission) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center" style={{ background: 'var(--page-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#C14E83] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading Evidence Review Workspace...</p>
        </div>
      </div>
    );
  }

  // Active document object
  const activeDocument = submission.evidence.find((e) => e.id === selectedDocId) ?? submission.evidence[0];

  // Active document content (fallback to generic if content not pre-baked)
  const activeDocContent =
    activeDocument?.content ??
    generateGenericDocumentContent(
      activeDocument?.id ?? 'doc-01',
      activeDocument?.name ?? 'Statutory Record',
      submission.institution.name,
      submission.applicationId
    );

  const totalPages = activeDocContent?.pages?.length ?? activeDocument?.pageCount ?? 1;

  // Handler: Selecting a finding in the findings panel
  const handleSelectFinding = (finding: Finding) => {
    setSelectedFindingId(finding.id);

    // If finding points to a specific document, navigate to it
    if (finding.documentId) {
      setSelectedDocId(finding.documentId);
    }
    if (finding.pageNumber) {
      setCurrentPage(finding.pageNumber);
    }
  };

  // Handler: Selecting a document from left list
  const handleSelectDocument = (doc: EvidenceItem) => {
    setSelectedDocId(doc.id);
    setCurrentPage(1);

    // If doc has finding, optionally activate it
    if (doc.findingIds && doc.findingIds.length > 0) {
      setSelectedFindingId(doc.findingIds[0]);
    }
  };

  // Download handlers
  const handleDownloadSingle = (doc: EvidenceItem) => {
    if (!submission) return;
    const res = downloadSampleDocument(doc, submission);
    setDownloadNotice(res.message);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  const handleDownloadAll = async () => {
    if (!submission) return;
    setDownloadNotice('Building dossier ZIP with PDF files…');
    const res = await downloadAllDossierDocuments(submission);
    setDownloadNotice(res.message);
    setTimeout(() => setDownloadNotice(null), 4500);
  };

  const handleDownloadReport = () => {
    if (!submission) return;
    setDownloadNotice('Generating compliance scrutiny report PDF…');
    const res = downloadReviewSummaryReport(submission, auditEvents);
    setDownloadNotice(res.message);
    setTimeout(() => setDownloadNotice(null), 5000);
  };

  // Reviewer Confirmed Decision Action
  const handleConfirmAction = async (notes: string) => {
    if (!pendingActionType) return;
    const action = pendingActionType;
    setActionLoading(action);
    setActionError(null);
    try {
      if (action === 'approve') {
        await approveSubmission(submission.id, { notes });
        setActionMessage({
          type: 'success',
          text: 'Reviewer recommendation recorded: Approval recommendation prepared for Council session.',
        });
      } else if (action === 'reject') {
        await rejectSubmission(submission.id, { reason: notes });
        setActionMessage({
          type: 'info',
          text: 'Reviewer recommendation recorded: Rejection order drafted with cited APH clauses.',
        });
      } else if (action === 'escalate') {
        await escalateSubmission(submission.id, { reason: notes });
        setActionMessage({
          type: 'info',
          text: 'Case escalation recorded: Forwarded to Standing Hearing Committee.',
        });
      } else if (action === 'request-evidence') {
        await requestEvidence(submission.id, { notes });
        setActionMessage({
          type: 'info',
          text: 'Clarification notice dispatched: Institution given 5 working days to furnish clarification letter.',
        });
      }

      setPendingActionType(null);
      await loadData();
      onStatusUpdated?.();
      setTimeout(() => setActionMessage(null), 4500);
    } catch (err: any) {
      setActionError(err.message || 'Action failed to persist.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto" style={{ background: 'var(--page-bg)' }}>
      {/* ─── Top Control & Profile Bar ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs sticky top-0 z-20">
        <div className="max-w-[1700px] mx-auto flex flex-col gap-3">
          {/* Top row: Back button, Title, ID, Badges, Actions */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title="Return to application list"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold leading-tight" style={{ color: '#351D31', fontFamily: "'DM Serif Display', Georgia, serif" }}>
                    {submission.institution.name}
                  </h1>
                  <StatusBadge status={submission.status} />
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      background: '#FDF0F5',
                      color: '#AA4777',
                      border: '1px solid #ECD9E2',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <HelpTooltip
                      term="Priority Score"
                      explanation="A guide to which application may need attention sooner based on severity of findings, deadlines, and risk score."
                    >
                      <span>Priority: {submission.priorityScore}</span>
                    </HelpTooltip>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-0.5 flex-wrap">
                  <span>App ID: {submission.applicationId}</span>
                  <span>·</span>
                  <span>AICTE ID: {submission.institution.aicteId}</span>
                  <span>·</span>
                  <span className="font-sans font-medium" style={{ color: '#55223F' }}>{submission.category}</span>
                </div>
              </div>
            </div>

            {/* Reviewer Action Controls + Upload + Dossier Download */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                icon={<FileText size={13} className="text-[#C14E83]" />}
                onClick={handleDownloadReport}
                className="cursor-pointer"
                title="Download official Compliance Scrutiny Summary Report PDF for committee review"
              >
                Review Report PDF
              </Button>

              <Button
                variant="outline"
                size="sm"
                icon={<FolderDown size={13} className="text-[#C14E83]" />}
                onClick={handleDownloadAll}
                className="cursor-pointer"
                title="Download all dossier documents as a single consolidated archive with watermark"
              >
                Download Dossier
              </Button>

              <Button
                variant="outline"
                size="sm"
                icon={<Upload size={13} className="text-[#AA4777]" />}
                onClick={() => setIsUploadModalOpen(true)}
                className="cursor-pointer"
                title="Upload new supporting document to run AICTE OCR & compliance checks"
              >
                Upload Evidence
              </Button>

              <Button
                variant="outline"
                size="sm"
                loading={actionLoading === 'request-evidence'}
                icon={<Send size={12} />}
                onClick={() => setPendingActionType('request-evidence')}
                title="Request additional documents from institution"
              >
                Request Clarification
              </Button>

              <Button
                variant="warning"
                size="sm"
                loading={actionLoading === 'escalate'}
                icon={<AlertTriangle size={12} />}
                onClick={() => setPendingActionType('escalate')}
                disabled={submission.status === 'escalated'}
                title="Escalate to Standing Hearing Committee"
              >
                Escalate
              </Button>

              <Button
                variant="danger"
                size="sm"
                loading={actionLoading === 'reject'}
                icon={<XCircle size={12} />}
                onClick={() => setPendingActionType('reject')}
                title="Draft speaking rejection order with statutory citations"
              >
                Reject Case
              </Button>

              <Button
                variant="primary"
                size="sm"
                loading={actionLoading === 'approve'}
                icon={<CheckCircle2 size={12} />}
                onClick={() => setPendingActionType('approve')}
                title={submission.findings.some((f) => f.severity === 'critical') ? 'Approval restricted while critical findings exist' : 'Recommend for AICTE Council approval'}
              >
                {submission.findings.some((f) => f.severity === 'critical') ? 'Approval (Restricted)' : 'Approve Case'}
              </Button>
            </div>
          </div>

          {/* Action notification toast */}
          {actionMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: actionMessage.type === 'success' ? '#DEF7EC' : '#FDF0F5',
                border: '1px solid ' + (actionMessage.type === 'success' ? '#B4E7D0' : '#ECD9E2'),
                color: actionMessage.type === 'success' ? '#065F46' : '#55223F',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              className="animate-fadeIn"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className={actionMessage.type === 'success' ? 'text-emerald-600' : 'text-[#C14E83]'} />
                <span className="font-medium">{actionMessage.text}</span>
              </div>
              <span style={{ fontSize: 10, color: '#896F81', fontStyle: 'italic' }}>
                Prototype environment · Action recorded in audit trail
              </span>
            </div>
          )}

          {/* Download notification toast */}
          {downloadNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span className="font-medium">{downloadNotice}</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-mono">
                Sample watermark applied
              </span>
            </div>
          )}

          {/* Workspace Tabs */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-2 text-xs">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('evidence')}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  background: activeTab === 'evidence' ? 'linear-gradient(135deg, #251421 0%, #351D31 100%)' : '#fff',
                  color: activeTab === 'evidence' ? '#fff' : '#55223F',
                  border: '1px solid ' + (activeTab === 'evidence' ? '#C14E83' : '#ECD9E2'),
                }}
              >
                <FileText size={13} />
                <span>1. Evidence & Document Scrutiny</span>
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: activeTab === 'evidence' ? 'rgba(255,255,255,0.2)' : '#FDF0F5',
                    color: activeTab === 'evidence' ? '#fff' : '#C14E83',
                  }}
                >
                  {submission.findings.length} findings
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cross-doc')}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  background: activeTab === 'cross-doc' ? 'linear-gradient(135deg, #251421 0%, #351D31 100%)' : '#fff',
                  color: activeTab === 'cross-doc' ? '#fff' : '#55223F',
                  border: '1px solid ' + (activeTab === 'cross-doc' ? '#C14E83' : '#ECD9E2'),
                }}
              >
                <GitCompare size={13} />
                <span>2. Cross-Document Reconciliation</span>
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: activeTab === 'cross-doc' ? 'rgba(255,255,255,0.2)' : '#FDF0F5',
                    color: activeTab === 'cross-doc' ? '#fff' : '#C14E83',
                  }}
                >
                  {submission.crossDocComparisons?.length ?? 0} checks
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  background: activeTab === 'notes' ? 'linear-gradient(135deg, #251421 0%, #351D31 100%)' : '#fff',
                  color: activeTab === 'notes' ? '#fff' : '#55223F',
                  border: '1px solid ' + (activeTab === 'notes' ? '#C14E83' : '#ECD9E2'),
                }}
              >
                <MessageSquare size={13} />
                <span>3. Reviewer Notes & Timeline</span>
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: activeTab === 'notes' ? 'rgba(255,255,255,0.2)' : '#FDF0F5',
                    color: activeTab === 'notes' ? '#fff' : '#C14E83',
                  }}
                >
                  {submission.reviewerNotesList?.length ?? 0} notes
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" />
                Submitted: {formatDate(submission.submittedAt)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-slate-400" />
                {submission.institution.city}, {submission.institution.state}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Workspace Body ──────────────────────────────────────────────────── */}
      <div className="p-6 max-w-[1700px] w-full mx-auto flex-1 flex flex-col min-h-0">
        {activeTab === 'evidence' && (
          <div className="grid grid-cols-12 gap-5 flex-1 min-h-[750px] items-stretch">
            {/* Left Column: Document List Picker (Col 1-3) */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col h-full">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 uppercase tracking-wide">
                    <FileText size={14} className="text-[#C14E83]" />
                    <HelpTooltip
                      term="Evidence dossier"
                      explanation="The application and its supporting documents grouped together for reviewer evaluation."
                    >
                      <span>Dossier ({submission.evidence.length})</span>
                    </HelpTooltip>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#C14E83] hover:text-[#AA4777] bg-[#FFF5F7] hover:bg-[#ECD9E2]/50 border border-[#ECD9E2] px-2 py-1 rounded transition-colors cursor-pointer"
                    title="Download all sample documents in this dossier as a consolidated archive"
                  >
                    <FolderDown size={11} />
                    <span>Download All</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
                  {submission.evidence.map((doc) => {
                    const isSelected = doc.id === selectedDocId;
                    const hasFindings = doc.findingIds && doc.findingIds.length > 0;

                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleSelectDocument(doc)}
                        className={`
                          p-3 rounded-xl border cursor-pointer transition-all duration-150 text-left
                          ${isSelected
                            ? 'border-[#C14E83] bg-[#FFF5F7] shadow-xs'
                            : 'border-slate-200 bg-white hover:border-[#ECD9E2] hover:bg-slate-50/60'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className={`text-xs font-semibold leading-tight line-clamp-2 ${isSelected ? 'text-[#C14E83]' : 'text-slate-800'}`}>
                            {doc.name}
                          </span>
                          {hasFindings && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              {doc.findingIds?.length} Flagged
                            </span>
                          )}
                        </div>

                        {doc.description && (
                          <p className="text-[11px] text-slate-600 mb-1.5 leading-snug line-clamp-2">
                            {doc.description}
                          </p>
                        )}

                        <div className="text-[10px] font-mono text-slate-500 truncate mb-1" title={doc.filename ?? doc.name}>
                          {doc.filename ?? `${doc.name}.txt`}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                          <span className="uppercase font-medium text-slate-500">
                            {doc.type.replace(/_/g, ' ')}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadSingle(doc);
                            }}
                            className="flex items-center gap-1 font-bold text-[#C14E83] hover:text-[#AA4777] hover:underline cursor-pointer"
                            title="Download this sample document proforma"
                          >
                            <Download size={10} />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Left Column Disclaimer */}
                <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                  Select a document to inspect its certified contents and highlighted annotations.
                </div>
              </div>
            </div>

            {/* Center Column: Document Viewer (Col 4-8) */}
            <div className="col-span-12 lg:col-span-5 flex flex-col min-h-[750px]">
              <DocumentViewer
                content={activeDocContent}
                documentName={activeDocument.filename ?? activeDocument.name}
                documentType={activeDocument.type.replace(/_/g, ' ').toUpperCase()}
                checksumSha256={activeDocument.checksumSha256}
                activeFindingId={selectedFindingId}
                onSelectFinding={(id) => {
                  setSelectedFindingId(id);
                }}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                totalPages={totalPages}
                onDownloadCurrentDocument={() => handleDownloadSingle(activeDocument)}
                onInspectFindingModal={(fId) => {
                  const f = submission.findings.find((x) => x.id === fId);
                  if (f) setInspectingFinding(f);
                }}
              />
            </div>

            {/* Right Column: Findings Panel (Col 9-12) */}
            <div className="col-span-12 lg:col-span-4 flex flex-col min-h-[750px]">
              <FindingsPanel
                findings={submission.findings}
                activeFindingId={selectedFindingId}
                onSelectFinding={handleSelectFinding}
                activeDocumentName={activeDocument.filename ?? activeDocument.name}
                onNavigateToDocument={(docId, pageNum) => {
                  setSelectedDocId(docId);
                  setCurrentPage(pageNum);
                }}
                onInspectFinding={(f) => setInspectingFinding(f)}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Cross Document Reconciliation */}
        {activeTab === 'cross-doc' && (
          <div className="flex flex-col gap-4">
            <CrossDocComparisonView
              comparisons={submission.crossDocComparisons}
              onSelectDocumentByName={(docName) => {
                const found = submission.evidence.find((e) => e.name.includes(docName) || e.filename?.includes(docName));
                if (found) {
                  setSelectedDocId(found.id);
                  setActiveTab('evidence');
                }
              }}
            />
          </div>
        )}

        {/* Tab 3: Reviewer Notes & Timeline */}
        {activeTab === 'notes' && (
          <div className="flex flex-col gap-4">
            <ReviewerNotesAndTimeline
              submissionId={submission.id}
              notes={submission.reviewerNotesList}
              auditHistory={auditEvents}
              onNoteAdded={loadData}
            />
          </div>
        )}
      </div>

      {/* Inspect Finding Modal */}
      <InspectFindingModal
        isOpen={Boolean(inspectingFinding)}
        onClose={() => setInspectingFinding(null)}
        finding={inspectingFinding}
        submission={submission}
        onNavigateToDocument={(docId, pageNum) => {
          setSelectedDocId(docId);
          setCurrentPage(pageNum);
          setActiveTab('evidence');
          setInspectingFinding(null);
        }}
        onDownloadNotification={(msg) => {
          setDownloadNotice(msg);
          setTimeout(() => setDownloadNotice(null), 4000);
        }}
      />

      {/* Consequential Reviewer Action Modal */}
      <ConsequentialActionModal
        isOpen={pendingActionType !== null}
        onClose={() => {
          setPendingActionType(null);
          setActionError(null);
        }}
        actionType={pendingActionType}
        submission={submission}
        loading={actionLoading !== null}
        errorMessage={actionError}
        onConfirm={handleConfirmAction}
      />

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        submissionId={submission.id}
        institutionName={submission.institution.name}
        onDocumentUploaded={async (res) => {
          setIsUploadModalOpen(false);
          const fieldsCount = Object.keys(res.extractedFields || {}).length;
          const findingsCount = (res.findingsRaised || []).length;
          setActionMessage({
            type: 'success',
            text: `Document uploaded: "${res.filename}" processed (${fieldsCount} fields extracted, ${findingsCount} rule checks evaluated).`,
          });
          await loadData();
          onStatusUpdated?.();
          setTimeout(() => setActionMessage(null), 5000);
        }}
      />
    </div>
  );
};

