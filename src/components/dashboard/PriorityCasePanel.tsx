import React, { useState } from 'react';
import type { Submission, Finding } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { SeverityBadge } from '../ui/SeverityBadge';
import { Button } from '../ui/Button';
import { HelpTooltip } from '../ui/HelpTooltip';
import { InspectFindingModal } from '../common/InspectFindingModal';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { downloadSampleDocument, downloadAllDossierDocuments } from '../../utils/downloadHelpers';
import {
  Building2,
  Calendar,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
  Tag,
  ExternalLink,
  Download,
  FolderDown,
  Search,
  XCircle,
} from 'lucide-react';
import {
  approveSubmission,
  rejectSubmission,
  escalateSubmission,
  requestEvidence,
} from '../../services/api';

interface PriorityCasePanelProps {
  submission: Submission;
  onActionComplete?: () => void;
  onOpenReviewWorkspace?: (id: string) => void;
}

const EVIDENCE_ICONS: Record<string, string> = {
  document: '📄',
  affidavit: '📜',
  noc: '✅',
  approval_letter: '📮',
  financial_report: '💰',
  inspection_report: '🔍',
};

const VERIFICATION_CONFIG = {
  verified: { label: 'Verified', className: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  pending: { label: 'Pending', className: 'text-amber-700 bg-amber-50 border-amber-200' },
  disputed: { label: 'Disputed', className: 'text-red-700 bg-red-50 border-red-200' },
  missing: { label: 'Missing', className: 'text-slate-500 bg-slate-50 border-slate-200' },
};

export const PriorityCasePanel: React.FC<PriorityCasePanelProps> = ({
  submission,
  onActionComplete,
  onOpenReviewWorkspace,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [showDocumentsList, setShowDocumentsList] = useState(false);
  const [inspectingFinding, setInspectingFinding] = useState<Finding | null>(null);

  const handleAction = async (
    action: 'approve' | 'reject' | 'escalate' | 'request-evidence'
  ) => {
    setLoadingAction(action);
    try {
      if (action === 'approve') await approveSubmission(submission.id);
      else if (action === 'reject') await rejectSubmission(submission.id);
      else if (action === 'escalate') await escalateSubmission(submission.id);
      else if (action === 'request-evidence') await requestEvidence(submission.id);
      setActionDone(action);
      setTimeout(() => setActionDone(null), 3000);
      onActionComplete?.();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDownloadSingle = (e: React.MouseEvent, doc: Submission['evidence'][0]) => {
    e.stopPropagation();
    const result = downloadSampleDocument(doc, submission);
    setDownloadNotice(result.message);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  const handleDownloadAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadNotice('Building dossier ZIP with PDF files…');
    const result = await downloadAllDossierDocuments(submission);
    setDownloadNotice(result.message);
    setTimeout(() => setDownloadNotice(null), 4500);
  };

  const criticalFindings = submission.findings.filter((f) => f.severity === 'critical');
  const otherFindings = submission.findings.filter((f) => f.severity !== 'critical');
  const canApprove = submission.findings.length === 0 && submission.status !== 'approved';
  const canReject = submission.status !== 'rejected';

  // Count evidence verification states
  const verifiedDocsCount = submission.evidence.filter((d) => d.verificationStatus === 'verified').length;
  const disputedDocsCount = submission.evidence.filter((d) => d.verificationStatus === 'disputed').length;
  const pendingDocsCount = submission.evidence.filter((d) => d.verificationStatus === 'pending' || d.verificationStatus === 'missing').length;

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col max-h-[calc(100vh-100px)] lg:sticky lg:top-4 overflow-hidden">
        {/* Panel header */}
        <div
          className="px-5 py-3.5 border-b border-slate-100 shrink-0"
          style={{ background: 'linear-gradient(135deg, #251421 0%, #351D31 60%, #481B38 100%)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-[#E0B0C8] uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <HelpTooltip
                  term="Priority Case"
                  explanation="A guide to which application may need attention sooner based on severity of findings, deadlines, and risk score."
                >
                  <span className="text-[#FFFAFC]">Priority Case</span>
                </HelpTooltip>
                <span>· Needs Attention</span>
                {submission.isSyntheticDemo && (
                  <span className="bg-[#FFF5F7]/20 text-[#FFF5F7] text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                    DEMO
                  </span>
                )}
              </div>
              <h3 className="text-white font-bold text-base leading-tight truncate">
                {submission.institution.name}
              </h3>
              <p className="text-[#E0B0C8] text-xs mt-0.5 font-mono">
                {submission.applicationId}
              </p>
            </div>
            <div className="shrink-0">
              <StatusBadge status={submission.status} />
            </div>
          </div>
        </div>

        {/* Download notice feedback banner */}
        {downloadNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 font-medium flex items-center gap-2 shrink-0 animate-fadeIn">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span className="truncate">{downloadNotice}</span>
          </div>
        )}

        {/* Scrollable middle content: Meta, Findings, Compact Evidence Summary */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100">
          {/* Institution meta */}
          <div className="px-5 py-3.5 bg-slate-50/50">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-start gap-2">
                <Building2 size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide">Type</div>
                  <div className="text-xs font-medium text-slate-700 capitalize truncate">
                    {submission.institution.type}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide">Location</div>
                  <div className="text-xs font-medium text-slate-700 truncate">
                    {submission.institution.city}, {submission.institution.state}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Tag size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide">Category</div>
                  <div className="text-xs font-medium text-slate-700 leading-tight truncate">
                    {submission.category}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide">Due Date</div>
                  <div className="text-xs font-medium text-slate-700 truncate">
                    {formatDate(submission.dueDate)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Why it needs attention / Findings */}
          {(criticalFindings.length > 0 || otherFindings.length > 0 || submission.reviewNotes) && (
            <div className="px-5 py-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-amber-500" />
                  <span>Key Findings ({submission.findings.length})</span>
                </h4>
                <HelpTooltip
                  term="Finding"
                  explanation="A possible issue that needs a reviewer to check; it is not a final decision or proof of non-compliance."
                  align="right"
                >
                  <span className="text-[10px] text-slate-400 hover:text-slate-600">Info</span>
                </HelpTooltip>
              </div>

              {submission.reviewNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2.5">
                  <p className="text-xs text-amber-900 leading-relaxed">{submission.reviewNotes}</p>
                </div>
              )}

              {/* Findings list */}
              {submission.findings.length > 0 && (
                <div className="flex flex-col gap-2">
                  {[...criticalFindings, ...otherFindings].map((finding) => (
                    <div
                      key={finding.id}
                      className="rounded-lg border p-2.5 transition-shadow hover:shadow-xs"
                      style={{
                        borderColor:
                          finding.severity === 'critical' ? '#fca5a5' :
                          finding.severity === 'major' ? '#fcd34d' : '#bfdbfe',
                        background:
                          finding.severity === 'critical' ? '#fff5f5' :
                          finding.severity === 'major' ? '#fffbeb' : '#eff6ff',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {finding.category}
                        </span>
                        <SeverityBadge severity={finding.severity} />
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed mb-2">
                        {finding.description}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock size={9} />
                          {formatDateTime(finding.flaggedAt).split(',')[0]}
                        </span>

                        <button
                          type="button"
                          onClick={() => setInspectingFinding(finding)}
                          className="flex items-center gap-1 font-bold text-[#C14E83] hover:text-[#AA4777] bg-[#FFF5F7] px-2 py-0.5 rounded border border-[#ECD9E2] transition-colors shadow-2xs cursor-pointer"
                          title="Inspect finding explanation, source rule, and recommended next step"
                        >
                          <Search size={10} />
                          <span>Inspect Finding</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Compact Evidence Dossier Summary & Control */}
          <div className="px-5 py-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <FileText size={13} className="text-[#C14E83]" />
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                  Evidence Dossier
                </h4>
                <span className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.2 rounded-full">
                  {submission.evidence.length} docs
                </span>
              </div>
              {onOpenReviewWorkspace && (
                <button
                  type="button"
                  onClick={() => onOpenReviewWorkspace(submission.id)}
                  className="text-xs font-bold text-[#C14E83] hover:text-[#AA4777] hover:underline flex items-center gap-1 cursor-pointer"
                  title="Open full interactive review workspace"
                >
                  <span>View full dossier</span>
                  <ExternalLink size={11} />
                </button>
              )}
            </div>

            {/* Compact summary card */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {verifiedDocsCount > 0 && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> {verifiedDocsCount} Verified
                    </span>
                  )}
                  {disputedDocsCount > 0 && (
                    <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <XCircle size={10} /> {disputedDocsCount} Disputed
                    </span>
                  )}
                  {pendingDocsCount > 0 && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={10} /> {pendingDocsCount} Pending Check
                    </span>
                  )}
                </div>
              </div>

              {/* Primary action to view full dossier + direct ZIP download */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                {onOpenReviewWorkspace ? (
                  <button
                    type="button"
                    onClick={() => onOpenReviewWorkspace(submission.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-[#C14E83] hover:bg-[#AA4777] py-1.5 px-3 rounded-md transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>Open Evidence Workspace</span>
                    <ExternalLink size={12} />
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleDownloadAll}
                  className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 py-1.5 px-2.5 rounded-md transition-colors cursor-pointer"
                  title="Download all documents in this dossier as a ZIP archive"
                >
                  <FolderDown size={12} className="text-[#C14E83]" />
                  <span>Download (ZIP)</span>
                </button>
              </div>

              {/* Quick toggle to inspect specific files without leaving this panel */}
              <div className="mt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowDocumentsList(!showDocumentsList)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>{showDocumentsList ? 'Hide quick document list' : 'Quick inspect individual documents'}</span>
                  {showDocumentsList ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {/* Collapsible quick document list */}
              {showDocumentsList && (
                <div className="flex flex-col gap-1.5 mt-2.5 pt-2 border-t border-slate-200 animate-fadeIn">
                  {submission.evidence.map((ev) => {
                    const vc = VERIFICATION_CONFIG[ev.verificationStatus];
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between gap-2 p-2 rounded bg-white border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm shrink-0">{EVIDENCE_ICONS[ev.type] ?? '📄'}</span>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 truncate" title={ev.name}>
                              {ev.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {ev.filename ?? 'document.pdf'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${vc.className}`}>
                            {vc.label}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDownloadSingle(e, ev)}
                            className="p-1 text-slate-400 hover:text-[#C14E83] hover:bg-[#FFF5F7] rounded transition-colors cursor-pointer"
                            title="Download document"
                          >
                            <Download size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DOCKED STICKY FOOTER: Reviewer Next Step & Decision Actions */}
        <div className="px-5 py-3 bg-[#FFFAFC] border-t border-[#ECD9E2] shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-[#C14E83]" />
              <span>Reviewer Actions</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              Always visible
            </span>
          </div>

          {actionDone ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-emerald-800">
                Action recorded successfully (simulated mock)
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {/* Primary action: Open Evidence Review Workspace */}
              {onOpenReviewWorkspace && (
                <button
                  type="button"
                  onClick={() => onOpenReviewWorkspace(submission.id)}
                  className="w-full flex items-center justify-center gap-1.5 bg-[#251421] hover:bg-[#351D31] text-white shadow-xs font-semibold cursor-pointer py-2 px-3 rounded-lg text-xs transition-colors border border-[#351D31]"
                  title="Open Full Evidence Dossier Review Workspace"
                >
                  <ExternalLink size={13} className="text-[#C14E83]" />
                  <span>Open Evidence Review Workspace</span>
                </button>
              )}

              {/* Main approval decision button */}
              <Button
                variant="primary"
                size="sm"
                disabled={!canApprove}
                loading={loadingAction === 'approve'}
                icon={<CheckCircle2 size={13} />}
                onClick={() => handleAction('approve')}
                className="w-full justify-center py-1.5 text-xs"
                title={canApprove ? 'Approve application' : 'Cannot approve while unresolved findings exist'}
              >
                {canApprove ? 'Approve Application' : 'Cannot Approve — Findings Exist'}
              </Button>

              {/* Secondary actions grid */}
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant="warning"
                  size="sm"
                  loading={loadingAction === 'escalate'}
                  icon={<AlertTriangle size={12} />}
                  onClick={() => handleAction('escalate')}
                  disabled={submission.status === 'escalated'}
                  className="py-1 text-xs"
                >
                  Escalate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  loading={loadingAction === 'request-evidence'}
                  icon={<Send size={12} />}
                  onClick={() => handleAction('request-evidence')}
                  className="py-1 text-xs"
                >
                  Request Docs
                </Button>
              </div>

              {/* Rejection action */}
              <Button
                variant="danger"
                size="sm"
                disabled={!canReject}
                loading={loadingAction === 'reject'}
                icon={<XCircle size={12} />}
                onClick={() => handleAction('reject')}
                className="w-full justify-center py-1 text-xs"
              >
                Reject Application
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Inspect Finding Modal */}
      <InspectFindingModal
        isOpen={Boolean(inspectingFinding)}
        onClose={() => setInspectingFinding(null)}
        finding={inspectingFinding}
        submission={submission}
        onOpenReviewWorkspace={onOpenReviewWorkspace}
        onDownloadNotification={(msg) => {
          setDownloadNotice(msg);
          setTimeout(() => setDownloadNotice(null), 4000);
        }}
      />
    </>
  );
};
