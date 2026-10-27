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
  FileText,
  ExternalLink,
} from 'lucide-react';
import { downloadSampleDocument } from '../../utils/downloadHelpers';

interface InspectFindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  finding: Finding | null;
  submission?: Submission | null;
  onOpenReviewWorkspace?: (submissionId: string) => void;
  onNavigateToDocument?: (documentId: string, pageNumber: number) => void;
  onDownloadNotification?: (message: string) => void;
}

export const InspectFindingModal: React.FC<InspectFindingModalProps> = ({
  isOpen,
  onClose,
  finding,
  submission,
  onOpenReviewWorkspace,
  onNavigateToDocument,
  onDownloadNotification,
}) => {
  if (!isOpen || !finding) return null;

  const relatedDoc = submission?.evidence.find(
    (ev) =>
      ev.id === finding.documentId ||
      ev.filename === finding.documentName ||
      ev.name.includes(finding.documentName ?? '###'),
  );

  const defaultNextStep =
    finding.severity === 'critical'
      ? 'Issue a formal statutory query to the institution registrar requiring certified credential verification prior to Regional Committee sanction.'
      : finding.severity === 'major'
      ? 'Request official OEM purchase orders, delivery challans, and physical asset register. Schedule on-site physical re-inspection.'
      : 'Request certified State Government gazette notification or registered trust resolution confirming continuity between entity names.';

  const handleDownloadDoc = () => {
    if (relatedDoc && submission) {
      const res = downloadSampleDocument(relatedDoc, submission);
      if (onDownloadNotification) {
        onDownloadNotification(res.message);
      }
    } else if (submission && submission.evidence.length > 0) {
      const fallbackDoc = submission.evidence[0];
      const res = downloadSampleDocument(fallbackDoc, submission);
      if (onDownloadNotification) {
        onDownloadNotification(res.message);
      }
    }
  };

  const handleOpenWorkspace = () => {
    onClose();
    if (submission && onOpenReviewWorkspace) {
      onOpenReviewWorkspace(submission.id);
    }
  };

  const handleNavigateToDoc = () => {
    if (onNavigateToDocument && finding.documentId && finding.pageNumber) {
      onNavigateToDocument(finding.documentId, finding.pageNumber);
      onClose();
    } else if (submission && onOpenReviewWorkspace) {
      handleOpenWorkspace();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="rounded-2xl shadow-2xl border w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: '#FFFFFF',
          borderColor: 'var(--border-soft)',
        }}
      >
        {/* Header - Cherry Blossom Noir */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, #1A0D18 0%, #351D31 100%)',
            borderBottom: '1px solid #55223F',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md"
              style={{
                background: 'linear-gradient(135deg, #8A2F5B 0%, #C14E83 100%)',
              }}
            >
              <ShieldAlert size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-sm">
                  Finding Inspection · {finding.category}
                </h3>
                <SeverityBadge severity={finding.severity} />
              </div>
              {submission && (
                <p className="text-xs font-mono mt-0.5" style={{ color: '#F8E5ED' }}>
                  {submission.institution.name} ({submission.applicationId})
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs text-slate-700">
          {/* Advisory Notice */}
          <div
            className="p-3.5 rounded-xl flex items-start gap-2.5"
            style={{
              background: '#FFF5F7',
              border: '1px solid #ECD9E2',
              color: '#351D31',
            }}
          >
            <Info size={16} className="text-[#C14E83] mt-0.5 shrink-0" />
            <div className="leading-relaxed">
              <span className="font-bold text-[#8A2F5B]">Reviewer Advisory: </span>
              This automated finding flags a potential regulatory discrepancy for officer verification.
              It is an indicator for evidentiary inquiry, not conclusive proof of non-compliance or document fraud.
            </div>
          </div>

          {/* Issue Summary & Rationale */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
            <h4 className="font-bold text-xs uppercase tracking-wider mb-2 text-[#896F81]">
              Observed Discrepancy
            </h4>
            <p className="text-sm font-semibold text-slate-900 mb-2 leading-relaxed">
              {finding.description}
            </p>
            {finding.reason && (
              <div
                className="text-xs leading-relaxed p-3 rounded-lg border mt-2"
                style={{
                  background: '#FDF2F6',
                  borderColor: '#ECD9E2',
                  color: '#351D31',
                }}
              >
                <div className="font-bold text-[11px] text-[#AA4777] mb-1">
                  Analysis Rationale & Context:
                </div>
                {finding.reason}
              </div>
            )}
          </div>

          {/* Regulatory Citation */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-[#896F81] flex items-center gap-1.5">
                <BookOpen size={13} className="text-[#C14E83]" />
                Regulatory Standard Citation
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded font-bold bg-[#F8E5ED] text-[#8A2F5B] border border-[#ECD9E2]">
                AICTE APH Standard
              </span>
            </div>
            <p className="text-xs text-slate-800 font-mono bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed">
              {finding.ruleOrCheck ?? 'AICTE Approval Process Handbook (APH) 2024–2027'}
            </p>
          </div>

          {/* Related Document & Page Link */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: '#FFF5F7', color: '#C14E83' }}
              >
                <FileText size={18} />
              </div>
              <div>
                <div className="text-[11px] text-[#896F81] font-semibold uppercase tracking-wider">
                  Evidentiary Source Instrument
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                  {relatedDoc?.name ?? finding.documentName ?? 'Submitted Application Dossier'}
                </div>
                {finding.pageNumber && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Flagged at Page {finding.pageNumber} · Specific Clause / Paragraph
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {finding.documentId && (
                <button
                  type="button"
                  onClick={handleNavigateToDoc}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer"
                  style={{
                    background: '#FFF5F7',
                    borderColor: '#ECD9E2',
                    color: '#8A2F5B',
                  }}
                  title="Open this document directly in the document viewer"
                >
                  <ExternalLink size={12} />
                  <span>Inspect in Viewer</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadDoc}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                title="Download this document with evaluation watermark"
              >
                <Download size={13} className="text-[#C14E83]" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* Recommended Reviewer Action */}
          <div
            className="p-4 rounded-xl border flex flex-col gap-1.5"
            style={{
              background: '#DEF7EC',
              borderColor: '#B4E7D0',
              color: '#065F46',
            }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-700" />
              <h4 className="font-bold text-xs uppercase tracking-wide text-emerald-900">
                Recommended Action for Review Officer
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-emerald-950 font-medium">
              {finding.reviewerNextStep ?? defaultNextStep}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between"
          style={{ background: '#FFFAFC', borderColor: 'var(--border-soft)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Close Inspector
          </button>

          {submission && onOpenReviewWorkspace && (
            <button
              type="button"
              onClick={handleOpenWorkspace}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #8A2F5B 0%, #C14E83 100%)',
              }}
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
