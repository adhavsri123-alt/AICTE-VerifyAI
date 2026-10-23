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
import { downloadSampleDocument, downloadAllDossierDocuments } from '../utils/downloadHelpers';
import { DocumentViewer } from '../components/review/DocumentViewer';
import { FindingsPanel } from '../components/review/FindingsPanel';
import { CrossDocComparisonView } from '../components/review/CrossDocComparisonView';
import { ReviewerNotesAndTimeline } from '../components/review/ReviewerNotesAndTimeline';
import { generateGenericDocumentContent } from '../data/reviewMockDetails';
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
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
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
      <div className="flex-1 p-8 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
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

  // Simulated Decision Action
  const handleSimulatedAction = async (action: 'approve' | 'reject' | 'escalate' | 'request-evidence') => {
    setActionLoading(action);
    try {
      if (action === 'approve') {
        await approveSubmission(submission.id, { notes: 'Simulated recommendation: All regulatory norms cleared.' });
        setActionMessage({
          type: 'success',
          text: 'Simulated recommendation recorded: Approval recommendation prepared for Council session.',
        });
      } else if (action === 'reject') {
        await rejectSubmission(submission.id, { reason: 'Simulated recommendation: Rejected due to critical doctoral cadre deficiency.' });
        setActionMessage({
          type: 'info',
          text: 'Simulated recommendation recorded: Rejection order drafted with cited APH clauses.',
        });
      } else if (action === 'escalate') {
        await escalateSubmission(submission.id, { reason: 'Escalated to Special Scrutiny Board.' });
        setActionMessage({
          type: 'info',
          text: 'Simulated case escalation recorded: Forwarded to Regional Hearing Board.',
        });
      } else if (action === 'request-evidence') {
        await requestEvidence(submission.id, { notes: 'Clarification requested regarding faculty qualification records.' });
        setActionMessage({
          type: 'info',
          text: 'Simulated inquiry dispatched: Institution given 5 working days to furnish clarification letter.',
        });
      }

      // Reload local data and notify parent
      await loadData();
      onStatusUpdated?.();
      setTimeout(() => setActionMessage(null), 4000);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#eef2fb] overflow-y-auto">
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
                  <h1 className="text-lg font-bold text-slate-900 leading-tight">
                    {submission.institution.name}
                  </h1>
                  <StatusBadge status={submission.status} />
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
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
                  <span className="text-slate-600 font-sans font-medium">{submission.category}</span>
                </div>
              </div>
            </div>

            {/* Simulated Action Controls + Dossier Download */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                icon={<FolderDown size={13} className="text-blue-600" />}
                onClick={handleDownloadAll}
                className="cursor-pointer"
                title="Download all dossier documents as a single consolidated archive with watermark"
              >
                Download All Dossier Documents
              </Button>

              <Button
                variant="outline"
                size="sm"
                loading={actionLoading === 'request-evidence'}
                icon={<Send size={12} />}
                onClick={() => handleSimulatedAction('request-evidence')}
                title="Simulate request for additional documents"
              >
                Request Clarification
              </Button>

              <Button
                variant="warning"
                size="sm"
                loading={actionLoading === 'escalate'}
                icon={<AlertTriangle size={12} />}
                onClick={() => handleSimulatedAction('escalate')}
                disabled={submission.status === 'escalated'}
              >
                Escalate
              </Button>

              <Button
                variant="danger"
                size="sm"
                loading={actionLoading === 'reject'}
                icon={<XCircle size={12} />}
                onClick={() => handleSimulatedAction('reject')}
              >
                Simulate Reject
              </Button>

              <Button
                variant="primary"
                size="sm"
                loading={actionLoading === 'approve'}
                icon={<CheckCircle2 size={12} />}
                onClick={() => handleSimulatedAction('approve')}
              >
                Simulate Approve
              </Button>
            </div>
          </div>

          {/* Action notification toast */}
          {actionMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600" />
                <span className="font-medium">{actionMessage.text}</span>
              </div>
              <span className="text-[10px] text-blue-500 italic">
                Simulated action · Not an official regulatory order
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
                className={`
                  px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer
                  ${activeTab === 'evidence'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }
                `}
              >
                <FileText size={13} />
                <span>1. Evidence & Document Scrutiny</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                  {submission.findings.length} findings
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cross-doc')}
                className={`
                  px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer
                  ${activeTab === 'cross-doc'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }
                `}
              >
                <GitCompare size={13} />
                <span>2. Cross-Document Reconciliation</span>
                <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-1.5 py-0.2 rounded-full">
                  Sample Check
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`
                  px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer
                  ${activeTab === 'notes'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }
                `}
              >
                <MessageSquare size={13} />
                <span>3. Reviewer Notes & Timeline</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-medium">
                  {submission.reviewerNotesList?.length ?? 0}
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
                    <FileText size={14} className="text-blue-600" />
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
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded transition-colors cursor-pointer"
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
                            ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/60'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className={`text-xs font-semibold leading-tight line-clamp-2 ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
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
                            className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
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
        onDownloadNotification={(msg) => {
          setDownloadNotice(msg);
          setTimeout(() => setDownloadNotice(null), 4000);
        }}
      />
    </div>
  );
};

