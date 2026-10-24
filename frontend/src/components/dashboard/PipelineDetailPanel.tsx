import React, { useState } from 'react';
import type { Submission, Finding } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { SeverityBadge } from '../ui/SeverityBadge';
import { HelpTooltip } from '../ui/HelpTooltip';
import { InspectFindingModal } from '../common/InspectFindingModal';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { downloadAllDossierDocuments } from '../../utils/downloadHelpers';
import {
  X,
  Building2,
  MapPin,
  Tag,
  Calendar,
  AlertTriangle,
  FileText,
  FolderDown,
  ExternalLink,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface PipelineDetailPanelProps {
  submission: Submission;
  onClose?: () => void;
  onOpenReviewWorkspace?: (id: string) => void;
}

export const PipelineDetailPanel: React.FC<PipelineDetailPanelProps> = ({
  submission,
  onClose,
  onOpenReviewWorkspace,
}) => {
  const [inspectingFinding, setInspectingFinding] = useState<Finding | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const criticalFindings = submission.findings.filter((f) => f.severity === 'critical');
  const otherFindings = submission.findings.filter((f) => f.severity !== 'critical');

  const verifiedCount = submission.evidence.filter((e) => e.verificationStatus === 'verified').length;
  const disputedCount = submission.evidence.filter((e) => e.verificationStatus === 'disputed').length;
  const pendingCount = submission.evidence.filter((e) => e.verificationStatus === 'pending' || e.verificationStatus === 'missing').length;

  const handleDownloadAll = async () => {
    setDownloadNotice('Building dossier ZIP with PDF files...');
    const result = await downloadAllDossierDocuments(submission);
    setDownloadNotice(result.message);
    setTimeout(() => setDownloadNotice(null), 4500);
  };

  const isActionQueueItem = ['escalated', 'under_review', 'on_hold'].includes(submission.status);

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:sticky lg:top-4 max-h-[calc(100vh-100px)]">
        {/* Panel Header */}
        <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-900 text-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                <span>Application Record</span>
                <span>•</span>
                <span className="text-slate-300">Pipeline Inspector</span>
              </div>
              <h3 className="text-white font-bold text-sm leading-snug truncate" title={submission.institution.name}>
                {submission.institution.name}
              </h3>
              <p className="text-slate-400 text-[11px] font-mono mt-0.5">
                {submission.applicationId}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={submission.status} size="sm" />
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close inspector panel"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Download notification */}
        {downloadNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 font-medium flex items-center gap-2 animate-fadeIn shrink-0">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span className="truncate">{downloadNotice}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
          {/* Institution Metadata */}
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

          {/* Priority Score & Status Snapshot */}
          <div className="p-4 flex items-center justify-between gap-3 bg-white">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Priority Ranking Score
              </div>
              <div className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-2">
                <span>{submission.priorityScore} / 100</span>
                <span className="text-[10px] font-medium text-slate-500">
                  ({submission.priorityScore >= 80 ? 'High' : submission.priorityScore >= 55 ? 'Moderate' : 'Routine'})
                </span>
              </div>
            </div>

            <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${submission.priorityScore}%`,
                  background:
                    submission.priorityScore >= 80 ? '#dc2626' :
                    submission.priorityScore >= 55 ? '#d97706' : '#059669',
                }}
              />
            </div>
          </div>

          {/* Action Queue Context Banner (If case is in Action Queue) */}
          {isActionQueueItem && (
            <div className="px-4 py-3 bg-amber-50/70 border-l-4 border-amber-500">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-0.5">
                <AlertTriangle size={12} className="text-amber-600" />
                <span>Requires Reviewer Action</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-snug">
                This submission has active flags requiring reviewer escalation, docs request, or decision.
              </p>
            </div>
          )}

          {/* Findings & Compliance Flags */}
          <div className="p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-amber-500" />
                <span>Compliance Flags ({submission.findings.length})</span>
              </h4>
              <HelpTooltip
                term="Finding"
                explanation="A possible issue flagged during automated cross-checks. Requires reviewer assessment."
                align="right"
              >
                <span className="text-[10px] text-slate-400 font-semibold cursor-help">Finding info</span>
              </HelpTooltip>
            </div>

            {submission.findings.length === 0 ? (
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-3 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>No automated compliance flags detected for this submission.</span>
              </div>
            ) : (
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
                      <SeverityBadge severity={finding.severity} />
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
                        title="Inspect finding details"
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

          {/* Evidence Dossier Snapshot */}
          <div className="p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileText size={12} className="text-blue-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Evidence Dossier
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {submission.evidence.length} Files
              </span>
            </div>

            {/* Status breakdown pills */}
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

            {/* Download dossier ZIP */}
            <button
              type="button"
              onClick={handleDownloadAll}
              className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 px-3 py-2 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Download all sample documents in this dossier as a consolidated ZIP"
            >
              <FolderDown size={13} className="text-blue-600" />
              <span>Download Full Dossier (ZIP)</span>
            </button>
          </div>
        </div>

        {/* Footer / Review Navigation (Focused on Browsing & Dossier Review) */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/95 backdrop-blur-xs shrink-0 flex flex-col gap-2">
          {onOpenReviewWorkspace && (
            <button
              type="button"
              onClick={() => onOpenReviewWorkspace(submission.id)}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Open full interactive evidence dossier workspace with document viewer"
            >
              <ExternalLink size={13} />
              <span>Open Review Workspace & Dossier</span>
            </button>
          )}

          <p className="text-[10px] text-slate-400 text-center leading-tight">
            Review workspace includes document-by-document viewer, proforma checks, and reviewer notes.
          </p>
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
