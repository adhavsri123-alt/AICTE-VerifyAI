import React from 'react';
import type { Finding, Submission } from '../../types';
import { SeverityBadge } from '../ui/SeverityBadge';
import {
  X,
  Download,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { downloadSampleDocument } from '../../utils/downloadHelpers';

interface InspectFindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  finding: Finding | null;
  submission?: Submission | null;
  onOpenReviewWorkspace?: (submissionId: string) => void;
  onDownloadNotification?: (message: string) => void;
}

export const InspectFindingModal: React.FC<InspectFindingModalProps> = ({
  isOpen,
  onClose,
  finding,
  submission,
  onOpenReviewWorkspace,
  onDownloadNotification,
}) => {
  if (!isOpen || !finding) return null;

  const relatedDoc = submission?.evidence.find(
    (ev) => ev.id === finding.documentId || ev.filename === finding.documentName || ev.name.includes(finding.documentName ?? '###')
  );

  const isSyntheticRule =
    finding.category.toLowerCase().includes('synthetic') ||
    finding.ruleOrCheck?.toLowerCase().includes('synthetic') ||
    finding.category.toLowerCase().includes('inventory');

  const defaultNextStep =
    finding.severity === 'critical'
      ? 'Issue a formal clarification query to the institution registrar and require submission of verified doctoral credentials prior to regional committee sanction.'
      : finding.severity === 'major'
      ? 'Request official OEM purchase orders, delivery challans, and physical asset register. Schedule on-site physical re-inspection.'
      : 'Request certified trust deed amendment or state government gazette notification reconciling entity name continuity.';

  const handleDownloadDoc = () => {
    if (relatedDoc && submission) {
      const res = downloadSampleDocument(relatedDoc, submission);
      if (onDownloadNotification) {
        onDownloadNotification(res.message);
      }
    } else if (submission) {
      // Fallback: download primary submission document
      const fallbackDoc = submission.evidence[0];
      if (fallbackDoc) {
        const res = downloadSampleDocument(fallbackDoc, submission);
        if (onDownloadNotification) {
          onDownloadNotification(res.message);
        }
      }
    }
  };

  const handleOpenWorkspace = () => {
    onClose();
    if (submission && onOpenReviewWorkspace) {
      onOpenReviewWorkspace(submission.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShieldAlert size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Finding Inspection · {finding.category}
                </h3>
                <SeverityBadge severity={finding.severity} />
              </div>
              {submission && (
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {submission.institution.name} ({submission.applicationId})
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs text-slate-700">
          {/* Advisory Notice */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-950">
            <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">Human Reviewer Advisory: </span>
              This automated finding highlights a possible issue for a reviewer to verify. It is an advisory check, not proof of non-compliance or a final decision.
            </div>
          </div>

          {/* Finding Description & Rationale */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 text-slate-500">
              Discrepancy Summary & Rationale
            </h4>
            <p className="text-sm font-semibold text-slate-900 mb-2 leading-relaxed">
              {finding.description}
            </p>
            {finding.reason && (
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {finding.reason}
              </p>
            )}
          </div>

          {/* Regulatory Citation or Demo Rule */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BookOpen size={13} className="text-blue-600" />
                Rule Reference / Verification Standard
              </span>
              <span
                className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold border ${
                  isSyntheticRule
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {isSyntheticRule ? 'Synthetic Demo Rule' : 'AICTE Statutory Rule'}
              </span>
            </div>
            <p className="text-xs text-slate-800 font-mono bg-slate-50 p-2.5 rounded border border-slate-200">
              {finding.ruleOrCheck ?? 'AICTE Approval Process Handbook (APH) 2024–2027'}
            </p>
          </div>

          {/* Related Document */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-base">
                📄
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Related Evidence Document
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  {relatedDoc?.name ?? finding.documentName ?? 'Submitted Proforma Dossier'}
                </div>
                {finding.pageNumber && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Flagged on Page {finding.pageNumber} · Proforma Section
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadDoc}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors shrink-0"
              title="Download this sample document with watermark"
            >
              <Download size={13} className="text-blue-600" />
              <span>Download File</span>
            </button>
          </div>

          {/* Recommended Reviewer Next Step */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <h4 className="font-bold text-xs text-emerald-900 uppercase tracking-wide">
                Recommended Reviewer Next Step
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-emerald-900 font-medium">
              {finding.reviewerNextStep ?? defaultNextStep}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
          >
            Close Inspector
          </button>

          {submission && onOpenReviewWorkspace && (
            <button
              type="button"
              onClick={handleOpenWorkspace}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <span>Open in Full Review Workspace</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
