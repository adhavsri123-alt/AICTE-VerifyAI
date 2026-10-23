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
  Link2,
  Tag,
  ExternalLink,
  Download,
  FolderDown,
  Search,
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
  const [showEvidence, setShowEvidence] = useState(true);
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

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold text-blue-200 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <HelpTooltip
                  term="Priority Case"
                  explanation="A guide to which application may need attention sooner based on severity of findings, deadlines, and risk score."
                >
                  <span className="text-blue-100">Priority Case</span>
                </HelpTooltip>
                <span>· Needs Attention</span>
              </div>
              <h3 className="text-white font-bold text-base leading-tight">
                {submission.institution.name}
              </h3>
              <p className="text-blue-200 text-xs mt-0.5 font-mono">
                {submission.applicationId}
              </p>
            </div>
            <StatusBadge status={submission.status} />
          </div>
        </div>

        {/* Full Evidence Dossier Action Banner */}
        {onOpenReviewWorkspace && (
          <div className="bg-blue-50/90 border-b border-blue-200 px-5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-blue-900 font-semibold">
              <ExternalLink size={13} className="text-blue-600" />
              <HelpTooltip
                term="Evidence dossier"
                explanation="The application and its supporting documents grouped together for reviewer evaluation."
              >
                <span>Full Evidence Dossier</span>
              </HelpTooltip>
            </div>
            <button
              type="button"
              onClick={() => onOpenReviewWorkspace(submission.id)}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
              title="Open full interactive review workspace with document viewer and findings inspection"
            >
              Open Dossier Workspace →
            </button>
          </div>
        )}

        {/* Download notice feedback banner */}
        {downloadNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs text-emerald-800 font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span className="truncate">{downloadNotice}</span>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Institution meta */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <Building2 size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide">Type</div>
                  <div className="text-xs font-medium text-slate-700 capitalize">
                    {submission.institution.type}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide">Location</div>
                  <div className="text-xs font-medium text-slate-700">
                    {submission.institution.city}, {submission.institution.state}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Tag size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide">Category</div>
                  <div className="text-xs font-medium text-slate-700 leading-tight">
                    {submission.category}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide">Due Date</div>
                  <div className="text-xs font-medium text-slate-700">
                    {formatDate(submission.dueDate)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Why it needs attention / Findings */}
          {(criticalFindings.length > 0 || otherFindings.length > 0 || submission.reviewNotes) && (
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-amber-500" />
                  <span>Why This Needs Attention</span>
                </h4>
                <HelpTooltip
                  term="Finding"
                  explanation="A possible issue that needs a reviewer to check; it is not a final decision or proof of non-compliance."
                  align="right"
                >
                  <span className="text-[10px] text-slate-500 font-semibold">Finding info</span>
                </HelpTooltip>
              </div>

              {submission.reviewNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-3">
                  <p className="text-xs text-amber-800 leading-relaxed">{submission.reviewNotes}</p>
                </div>
              )}

              {/* Findings list with working Inspect Finding button */}
              {submission.findings.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  {[...criticalFindings, ...otherFindings].map((finding) => (
                    <div
                      key={finding.id}
                      className="rounded-lg border p-3 transition-shadow hover:shadow-xs"
                      style={{
                        borderColor:
                          finding.severity === 'critical' ? '#fca5a5' :
                          finding.severity === 'major' ? '#fcd34d' : '#bfdbfe',
                        background:
                          finding.severity === 'critical' ? '#fff5f5' :
                          finding.severity === 'major' ? '#fffbeb' : '#eff6ff',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {finding.category}
                        </span>
                        <SeverityBadge severity={finding.severity} />
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed mb-2">
                        {finding.description}
                      </p>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock size={9} />
                          {formatDateTime(finding.flaggedAt).split(',')[0]}
                        </span>

                        <button
                          type="button"
                          onClick={() => setInspectingFinding(finding)}
                          className="flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 bg-white/90 hover:bg-white px-2 py-0.5 rounded border border-blue-200 transition-colors shadow-2xs cursor-pointer"
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

          {/* Evidence Dossier Documents with Downloads */}
          {submission.evidence.length > 0 && (
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setShowEvidence(!showEvidence)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <FileText size={12} className="text-blue-500" />
                  <span>Evidence ({submission.evidence.length})</span>
                  {showEvidence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {/* Download All Dossier Documents action */}
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
                  title="Download all sample documents in this dossier as a consolidated archive"
                >
                  <FolderDown size={12} />
                  <span>Download Dossier</span>
                </button>
              </div>

              {showEvidence && (
                <div className="flex flex-col gap-2 mt-3">
                  {submission.evidence.map((ev) => {
                    const vc = VERIFICATION_CONFIG[ev.verificationStatus];
                    return (
                      <div
                        key={ev.id}
                        className="flex flex-col gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span className="text-base shrink-0 mt-0.5">
                              {EVIDENCE_ICONS[ev.type] ?? '📄'}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-slate-800 leading-tight truncate">
                                {ev.name}
                              </div>
                              {ev.description && (
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                                  {ev.description}
                                </p>
                              )}
                              {ev.notes && (
                                <div className="text-[10px] text-amber-700 mt-0.5 font-medium">
                                  ⚠ {ev.notes}
                                </div>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${vc.className}`}
                          >
                            {vc.label}
                          </span>
                        </div>

                        {/* Document download action */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[10px] text-slate-400">
                          <span className="font-mono truncate max-w-[170px]" title={ev.filename ?? ev.name}>
                            {ev.filename ?? 'SAMPLE_DOCUMENT.txt'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDownloadSingle(e, ev)}
                            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            title="Download sample document proforma"
                          >
                            <Download size={10} />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Reviewer next step & Decision Actions */}
          <div className="px-5 py-4">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-blue-500" />
              <span>Reviewer Next Step</span>
            </h4>

            {actionDone ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">
                  Action recorded successfully (simulated mock)
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {onOpenReviewWorkspace && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<ExternalLink size={13} />}
                    onClick={() => onOpenReviewWorkspace(submission.id)}
                    className="w-full justify-center bg-blue-600 hover:bg-blue-700 shadow-sm font-semibold cursor-pointer"
                    title="Open Full Evidence Dossier Review Workspace"
                  >
                    Open Evidence Review Workspace
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!canApprove}
                  loading={loadingAction === 'approve'}
                  icon={<CheckCircle2 size={13} />}
                  onClick={() => handleAction('approve')}
                  className="w-full justify-center"
                  title={canApprove ? 'Approve application' : 'Cannot approve while unresolved findings exist'}
                >
                  {canApprove ? 'Approve Application' : 'Cannot Approve — Findings Exist'}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="warning"
                    size="sm"
                    loading={loadingAction === 'escalate'}
                    icon={<AlertTriangle size={13} />}
                    onClick={() => handleAction('escalate')}
                    disabled={submission.status === 'escalated'}
                  >
                    Escalate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={loadingAction === 'request-evidence'}
                    icon={<Send size={13} />}
                    onClick={() => handleAction('request-evidence')}
                  >
                    Request Docs
                  </Button>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  disabled={!canReject}
                  loading={loadingAction === 'reject'}
                  icon={<Link2 size={13} />}
                  onClick={() => handleAction('reject')}
                  className="w-full justify-center"
                >
                  Reject Application
                </Button>
              </div>
            )}
          </div>
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

