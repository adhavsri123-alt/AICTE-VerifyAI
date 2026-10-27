import React, { useRef, useEffect } from 'react';
import type { ReviewDocumentContent, FindingSeverity } from '../../types';
import {
  FileText,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  Download,
} from 'lucide-react';

interface DocumentViewerProps {
  content?: ReviewDocumentContent;
  documentName: string;
  documentType: string;
  checksumSha256?: string;
  activeFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  onDownloadCurrentDocument?: () => void;
  onInspectFindingModal?: (findingId: string) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  content,
  documentName,
  documentType,
  checksumSha256,
  activeFindingId,
  onSelectFinding,
  currentPage,
  onPageChange,
  totalPages,
  onDownloadCurrentDocument,
  onInspectFindingModal,
}) => {
  const [zoomLevel, setZoomLevel] = React.useState<number>(100);
  const activeSnippetRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to active finding snippet when it changes
  useEffect(() => {
    if (activeFindingId && activeSnippetRef.current) {
      activeSnippetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeFindingId, currentPage]);

  const activePageData = content?.pages.find((p) => p.pageNumber === currentPage) ?? content?.pages[0];

  const getSeverityStyle = (severity?: FindingSeverity, isActive?: boolean) => {
    if (isActive) {
      return 'bg-[#FFF5F7] border-l-4 border-[#C14E83] ring-2 ring-[#C14E83] shadow-md text-slate-900';
    }
    switch (severity) {
      case 'critical':
        return 'bg-red-50/90 border-l-4 border-red-500 hover:bg-red-100/80 text-slate-900';
      case 'major':
        return 'bg-amber-50/90 border-l-4 border-amber-500 hover:bg-amber-100/80 text-slate-900';
      case 'minor':
      case 'info':
      default:
        return 'bg-[#FFF5F7] border-l-4 border-[#C14E83] hover:bg-[#FDE8F1] text-slate-900';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl border border-slate-200 overflow-hidden shadow-inner">
      {/* Viewer toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={15} className="text-[#C14E83] shrink-0" />
          <span className="font-semibold text-slate-800 truncate max-w-[280px]" title={documentName}>
            {documentName}
          </span>
          <span className="px-2 py-0.5 bg-[#FFF5F7] text-[#8A2F5B] font-medium rounded text-[11px] shrink-0 border border-[#ECD9E2]">
            {documentType}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Page navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-600">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="hover:text-[#C14E83] disabled:opacity-40 transition-colors cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-mono text-[11px]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="hover:text-[#C14E83] disabled:opacity-40 transition-colors cursor-pointer"
                title="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(75, z - 10))}
              className="p-1 hover:text-[#C14E83] transition-colors text-slate-600 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[11px] font-mono text-slate-600 w-9 text-center">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              className="p-1 hover:text-[#C14E83] transition-colors text-slate-600 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="p-1 hover:text-[#C14E83] transition-colors text-slate-400 cursor-pointer"
              title="Reset zoom"
            >
              <RotateCcw size={12} />
            </button>
            {/* Download button */}
            {onDownloadCurrentDocument && (
              <button
                type="button"
                onClick={onDownloadCurrentDocument}
                className="flex items-center gap-1.5 bg-[#FFF5F7] hover:bg-[#FDE8F1] text-[#8A2F5B] border border-[#ECD9E2] rounded px-2.5 py-1 transition-colors font-semibold text-[11px] cursor-pointer shadow-2xs"
                title="Download this sample document proforma with watermark"
              >
                <Download size={12} className="text-[#C14E83]" />
                <span>Download Doc</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Checksum & Disclaimer banner */}
      {checksumSha256 && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-500 gap-3">
          <div className="flex items-center gap-1.5 font-mono truncate">
            <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
            <span className="text-slate-400">SHA-256:</span>
            <span className="text-slate-700 truncate">{checksumSha256}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0 italic">
            <Info size={11} className="text-slate-400" />
            <span>Integrity checksum only · Does not verify real-world authenticity</span>
          </div>
        </div>
      )}

      {/* Document page scroll canvas */}
      <div className="flex-1 overflow-auto p-4 md:p-6 flex justify-center items-start">
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
          className="w-full max-w-[800px] bg-white rounded-lg border border-slate-300 shadow-xl p-8 md:p-12 text-slate-800 relative transition-all min-h-[750px]"
        >
          {/* Simulated Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] select-none">
            <div className="text-5xl md:text-6xl font-extrabold uppercase tracking-widest text-slate-800 rotate-[-25deg] text-center border-4 border-slate-700 p-6 rounded-2xl">
              SAMPLE / DEMO<br />NOT AN OFFICIAL CERTIFICATE
            </div>
          </div>

          {/* Official Document Header */}
          <div className="text-center border-b-2 border-slate-700 pb-5 mb-6">
            <div className="inline-block border border-amber-500 bg-amber-50 rounded-full px-3 py-0.5 text-[10px] font-bold tracking-widest text-amber-800 uppercase mb-2">
              SAMPLE / DEMO PROFORMA — SIMULATED DOCUMENT
            </div>
            <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-wide uppercase font-serif">
              {content?.headerTitle ?? '[SAMPLE / DEMO] REGULATORY SCRUTINY CELL'}
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-1">
              {content?.subHeader ?? 'Affiliation, Accreditation and Statutory Verification Proforma (Demo Record)'}
            </p>

            <div className="grid grid-cols-2 text-left mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600 gap-2">
              <div>
                <span className="font-semibold text-slate-700">Ref. No: </span>
                <span className="font-mono text-slate-900">{content?.referenceNo ?? 'AICTE/SWRO/EVC/2024/0914'}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-slate-700">Date of Issue: </span>
                <span className="text-slate-900">{content?.issueDate ?? '28 October 2024'}</span>
              </div>
            </div>
          </div>

          {/* Document Content / Paragraphs with Highlighting */}
          <div className="flex flex-col gap-4 text-xs md:text-[13px] leading-relaxed text-slate-700">
            {activePageData?.paragraphs.map((p) => {
              const isFlagged = p.isDiscrepancy || Boolean(p.findingId);
              const isActive = p.findingId === activeFindingId;

              if (isFlagged) {
                return (
                  <div
                    key={p.id}
                    ref={isActive ? activeSnippetRef : null}
                    onClick={() => p.findingId && onSelectFinding(p.findingId)}
                    className={`
                      p-3.5 rounded-lg cursor-pointer transition-all duration-150 relative group
                      ${getSeverityStyle(p.highlightSeverity, isActive)}
                    `}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-[#351D31]">
                        <AlertCircle size={13} className={isActive ? 'text-[#C14E83]' : 'text-amber-600'} />
                        <span>{p.annotationTitle ?? 'Highlighted Regulatory Discrepancy'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (p.findingId) {
                            onSelectFinding(p.findingId);
                            if (onInspectFindingModal) {
                              onInspectFindingModal(p.findingId);
                            }
                          }
                        }}
                        className="text-[10px] font-medium text-[#8A2F5B] bg-white/90 px-2 py-0.5 rounded border border-[#ECD9E2] flex items-center gap-1 group-hover:bg-[#C14E83] group-hover:text-white transition-colors cursor-pointer"
                        title="Inspect full finding details in popup"
                      >
                        <span>Inspect Finding</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>

                    <p className="font-serif leading-relaxed text-slate-900">
                      {p.text}
                    </p>

                    <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-2">
                      <span className="font-mono uppercase tracking-wider text-[9px] bg-white px-1.5 py-0.5 rounded border border-slate-300">
                        Field: {p.fieldKey ?? 'Discrepancy Snippet'}
                      </span>
                      <span>· Click to reveal corresponding finding in right panel</span>
                    </div>
                  </div>
                );
              }


              return (
                <p key={p.id} className="font-serif leading-relaxed text-slate-700">
                  {p.text}
                </p>
              );
            })}
          </div>

          {/* Document Official Sign-off & Seal */}
          <div className="mt-10 pt-6 border-t border-slate-200 flex items-end justify-between flex-wrap gap-4 text-xs">
            <div className="border border-amber-300 rounded p-2.5 bg-amber-50/70 max-w-[280px]">
              <div className="text-[9px] font-bold uppercase tracking-wider text-amber-800 mb-0.5">
                Simulated Digital Verification Stamp
              </div>
              <div className="text-[10px] font-serif text-slate-700 italic">
                {content?.sealText ?? 'SAMPLE / DEMO PROFORMA · Technical Education Verification Cell'}
              </div>
            </div>

            <div className="text-right">
              <div className="h-9 mb-1 flex items-end justify-end">
                <span className="font-serif italic text-slate-700 text-sm border-b border-slate-300 pb-0.5 inline-block">
                  {content?.issuingAuthority?.split(',')[0] ?? 'Simulated Scrutiny Officer'}
                </span>
              </div>
              <div className="font-semibold text-slate-800 text-[11px]">
                {content?.issuingAuthority ?? 'Simulated Evaluation Record'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                [SAMPLE / DEMO RECORD] · Page {currentPage} of {totalPages}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
