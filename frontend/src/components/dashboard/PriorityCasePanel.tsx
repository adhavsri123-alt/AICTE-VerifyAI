import React, { useState } from 'react';
import type { Submission, Finding } from '../../types';
import {
  approveSubmission,
  rejectSubmission,
  escalateSubmission,
  requestEvidence,
} from '../../services/api';
import {
  downloadSampleDocument,
  downloadAllDossierDocuments,
} from '../../utils/downloadHelpers';
import { StatusBadge } from '../ui/StatusBadge';
import { SeverityBadge } from '../ui/SeverityBadge';
import { Button } from '../ui/Button';
import { HelpTooltip } from '../ui/HelpTooltip';
import { InspectFindingModal } from '../common/InspectFindingModal';
import { formatDate, formatDateTime } from '../../utils/helpers';
import {
  AlertTriangle,
  Building2,
  MapPin,
  Tag,
  Calendar,
  Clock,
  CheckCircle2,
  Send,
  Link2,
  ExternalLink,
  FileText,
  FolderDown,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface PriorityCasePanelProps {
  submission: Submission;
  onActionComplete?: () => void;
  onOpenReviewWorkspace?: (id: string) => void;
}

const VERIFICATION_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  verified: { label: 'Verified', className: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  unverified: { label: 'Unverified', className: 'text-amber-700 bg-amber-50 border-amber-200' },
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
  const [inspectingFinding, setInspectingFinding] = useState<Finding | null>(null);
  const [showQuickDocList, setShowQuickDocList] = useState(false);

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
    setDownloadNotice('Building dossier ZIP with PDF files...');
    const result = await downloadAllDossierDocuments(submission);
    setDownloadNotice(result.message);
    setTimeout(() => setDownloadNotice(null), 4500);
  };

  const criticalFindings = submission.findings.filter((f) => f.severity === 'critical');
  const otherFindings = submission.findings.filter((f) => f.severity !== 'critical');
  const canApprove = submission.findings.length === 0 && submission.status !== 'approved';
  const canReject = submission.status !== 'rejected';

  // Evidence counts
  const verifiedCount = submission.evidence.filter((e) => e.verificationStatus === 'verified').length;
  const disputedCount = submission.evidence.filter((e) => e.verificationStatus === 'disputed').length;
  const pendingCount = submission.evidence.filter((e) => e.verificationStatus === 'unverified' || e.verificationStatus === 'missing').length;

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:sticky lg:top-4 max-h-[calc(100vh-100px)]">
        {/* Panel header (Fixed at top) */}
        <div className="px-4 py-3.5 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-blue-700 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold text-blue-200 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                <HelpTooltip
                  term="Priority Case"
                  explanation="A guide to which application may need attention sooner based on severity of findings, deadlines, and risk score."
                >
                  <span className="text-blue-100">Priority Case</span>
                </HelpTooltip>
                <span>• Needs Attention</span>
              </div>
              <h3 className="text-white font-bold text-sm leading-snug truncate" title={submission.institution.name}>
                {submission.institution.name}
              </h3>
              <p className="text-blue-200 text-[11px] font-mono mt-0.5">
                {submission.applicationId}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <StatusBadge status={submission.status} size="sm" />
              <div className="flex items-center gap-1 bg-white/15 rounded px-1.5 py-0.5">
                <span className="text-[10px] text-blue-100 uppercase font-semibold">Priority</span>
                <span className="text-xs font-black text-white">{submission.priorityScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Download notice feedback banner */}
        {downloadNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 font-medium flex items-center gap-2 animate-fadeIn shrink-0">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span className="truncate">{downloadNotice}</span>
          </div>
        )}

        {/* Scrollable content body (Summary + Findings + Compact Evidence) */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
          {/* Institution meta (Compact 2x2 grid) */}
          <div className="p-4 bg-slate-50/50">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-start gap-1.5">
                <Building2 size={12} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Type</div>
                  <div className="text-[11px] font-medium text-slate-700 capitalize truncate">
                    {submission.institution.type}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-1.5">
                <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Location</div>
                  <div className="text-[11px] font-medium text-slate-700 truncate" title={`${submission.institution.city}, ${submission.institution.state}`}>
                    {submission.institution.city}, {submission.institution.state}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-1.5">
                <Tag size={12} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Category</div>
                  <div className="text-[11px] font-medium text-slate-700 leading-tight truncate" title={submission.category}>
                    {submission.category}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-1.5">
                <Calendar size={12} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Due Date</div>
                  <div className="text-[11px] font-medium text-slate-700 truncate">
                    {formatDate(submission.dueDate)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Why it needs attention / Findings */}
          {(criticalFindings.length > 0 || otherFindings.length > 0 || submission.reviewNotes) && (
            <div className="p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-amber-500" />
                  <span>Why This Needs Attention</span>
                </h4>
                <HelpTooltip
                  term="Finding"
                  explanation="A possible issue that needs a reviewer to check; it is not a final decision or proof of non-compliance."
                  align="right"
                >
                  <span className="text-[10px] text-slate-400 font-semibold cursor-help">Finding info</span>
                </HelpTooltip>
              </div>

              {submission.reviewNotes && (
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-lg p-2.5 text-xs text-amber-900 leading-relaxed">
                  {submission.reviewNotes}
                </div>
              )}

              {/* Findings cards */}
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
                        <span className="text-[11px] font-bold text-slate-800 truncate">
                          {finding.category}
                        </span>
                        <SeverityBadge severity={finding.severity} size="sm" />
                      </div>
                      <p className="text-[11px] text-slate-700 leading-snug mb-2 line-clamp-3">
                        {finding.description}
                      </p>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-mono text-[9px]">
                          <Clock size={9} />
                          {formatDateTime(finding.flaggedAt).split(',')[0]}
                        </span>

                        <button
                          type="button"
                          onClick={() => setInspectingFinding(finding)}
                          className="flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 bg-white/95 hover:bg-white px-2 py-0.5 rounded border border-blue-200 transition-colors shadow-2xs cursor-pointer text-[10px]"
                          title="Inspect finding explanation, source rule, and recommended next step"
                        >
                          <Search size={10} />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Compact Evidence Summary (Replaces long inline document list) */}
          {submission.evidence.length > 0 && (
            <div className="p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileText size={12} className="text-blue-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Evidence Summary
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {submission.evidence.length} Document{submission.evidence.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Status pills breakdown */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {verifiedCount > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck size={10} />
                    {verifiedCount} Verified
                  </span>
                )}
                {disputedCount > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                    <AlertTriangle size={10} />
                    {disputedCount} Disputed
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <Clock size={10} />
                    {pendingCount} Pending Check
                  </span>
                )}
              </div>

              {/* View full dossier & download actions */}
              <div className="flex flex-col gap-2 pt-1">
                {onOpenReviewWorkspace && (
                  <button
                    type="button"
                    onClick={() => onOpenReviewWorkspace(submission.id)}
                    className="w-full flex items-center justify-between bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-800 rounded-lg px-3 py-2 text-xs font-bold transition-colors cursor-pointer group shadow-2xs"
                    title="Open full interactive evidence dossier with PDF page preview and cross-document comparison"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText size={13} className="text-blue-600 group-hover:scale-110 transition-transform" />
                      View full dossier ({submission.evidence.length} documents)
                    </span>
                    <ArrowRight size={13} className="text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}

                <div className="flex items-center justify-between pt-0.5">
                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                    title="Download all sample documents in this dossier as a consolidated ZIP"
                  >
                    <FolderDown size={12} className="text-blue-600" />
                    <span>Download Dossier (ZIP)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQuickDocList(!showQuickDocList)}
                    className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>{showQuickDocList ? 'Hide quick list' : 'Quick file list'}</span>
                    {showQuickDocList ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {/* Collapsible quick document list */}
                {showQuickDocList && (
                  <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-slate-100">
                    {submission.evidence.map((ev) => {
                      const vc = VERIFICATION_CONFIG[ev.verificationStatus] ?? VERIFICATION_CONFIG.unverified;
                      return (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-slate-50 border border-slate-100 text-[11px]"
                        >
                          <span className="text-xs shrink-0">📄</span>
                          <span className="truncate flex-1 font-medium text-slate-800" title={ev.name}>
                            {ev.name}
                          </span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${vc.className}`}>
                            {vc.label}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDownloadSingle(e, ev)}
                            className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 cursor-pointer"
                            title="Download sample document"
                          >
                            <Download size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Compact Sticky Reviewer Actions Footer (Always visible at bottom) */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/95 backdrop-blur-xs shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-blue-600" />
              <span>Reviewer Next Step</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-semibold">Immediate action</span>
          </div>

          {actionDone ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-emerald-800">
                Action recorded successfully (simulated mock)
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {onOpenReviewWorkspace && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ExternalLink size={12} />}
                  onClick={() => onOpenReviewWorkspace(submission.id)}
                  className="w-full justify-center bg-blue-600 hover:bg-blue-700 shadow-sm font-semibold cursor-pointer text-xs py-1.5"
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
                icon={<CheckCircle2 size={12} />}
                onClick={() => handleAction('approve')}
                className="w-full justify-center text-xs py-1.5"
                title={canApprove ? 'Approve application' : 'Cannot approve while unresolved findings exist'}
              >
                {canApprove ? 'Approve Application' : 'Cannot Approve — Findings Exist'}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="warning"
                  size="sm"
                  loading={loadingAction === 'escalate'}
                  icon={<AlertTriangle size={12} />}
                  onClick={() => handleAction('escalate')}
                  disabled={submission.status === 'escalated'}
                  className="text-xs py-1.5"
                >
                  Escalate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  loading={loadingAction === 'request-evidence'}
                  icon={<Send size={12} />}
                  onClick={() => handleAction('request-evidence')}
                  className="text-xs py-1.5"
                >
                  Request Docs
                </Button>
              </div>

              <Button
                variant="danger"
                size="sm"
                disabled={!canReject}
                loading={loadingAction === 'reject'}
                icon={<Link2 size={12} />}
                onClick={() => handleAction('reject')}
                className="w-full justify-center text-xs py-1.5"
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
